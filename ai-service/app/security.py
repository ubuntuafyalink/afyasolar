"""Optional shared-secret gate in front of the prediction endpoints.

The service has no user model. It is designed to sit on a private network with
only the AfyaSolar web platform calling it, which is what the deployment guide
tells operators to do. Where that cannot be guaranteed — a shared cluster, a
public PaaS — setting ``AI_SERVICE_TOKEN`` requires callers to present it.

Leaving the variable unset disables the check, so existing deployments are
unaffected. ``/`` and ``/health`` are never gated: an operator's health probe
should not need the secret.
"""
from __future__ import annotations

import hmac

from fastapi import Request
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware

from app import config

# Liveness probes must work without the secret. Nothing else is exempt — the
# generated schema at /docs describes every endpoint, so it is gated too.
_OPEN_PATHS = frozenset({"/", "/health"})


def _token_ok(header: str | None) -> bool:
    if not header:
        return False
    scheme, _, presented = header.partition(" ")
    if scheme.lower() != "bearer" or not presented:
        return False
    # Compare bytes: compare_digest raises TypeError on non-ASCII str, and a
    # token is operator-supplied. Constant time, so a wrong token cannot be
    # recovered by timing the compare.
    return hmac.compare_digest(
        presented.encode("utf-8"), config.AUTH_TOKEN.encode("utf-8")
    )


class BearerTokenMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        if not config.AUTH_TOKEN:
            return await call_next(request)
        if request.method == "OPTIONS" or request.url.path in _OPEN_PATHS:
            return await call_next(request)
        if not _token_ok(request.headers.get("authorization")):
            return JSONResponse(
                {"detail": "Missing or invalid bearer token."},
                status_code=401,
                headers={"WWW-Authenticate": "Bearer"},
            )
        return await call_next(request)
