# Changelog

Notable changes to AfyaSolar Intelligence. This project follows
[semantic versioning](https://semver.org/); while it is pre-1.0, minor versions
may carry breaking changes and will say so here.

## Unreleased

### Security

- The six-digit email verification code is now generated with a cryptographically
  secure random source. It previously used `Math.random()`, whose internal state
  can be recovered from observed output, making codes predictable.
- Removed two unauthenticated endpoints that disclosed SMTP host, port and
  whether credentials were configured. The equivalent admin-gated diagnostics
  remain.
- `next/image` remote patterns are scoped to the image host actually in use. A
  wildcard hostname had made the image endpoint an open proxy that would fetch
  and re-serve any URL a caller supplied.
- Removed `api/facilities-backup/`, a second reachable copy of the facilities API
  including its user-creation path.
- The AI service can now require a bearer token (`AI_SERVICE_TOKEN`) and restrict
  browser origins. Both are optional and off by default, so existing deployments
  are unaffected. `/` and `/health` stay open so health probes keep working.

### Fixed

- Facility logo upload, referral codes and referral invitations returned 404. The
  route handlers existed only under a backup directory that the interface never
  called. **Behaviour change:** these three features now work.
- The public resilience feed published regions containing a single facility, and
  its portfolio totals allowed a withheld region to be recovered by subtraction.
  Regions below three facilities are now withheld, and their facilities excluded
  from the totals. **Consumers should expect fewer regions** and a portfolio
  count covering only reportable regions.
- Restored the continuous integration coverage gate, which had been failing for a
  month after three modules entered the measured set without tests.
- Continuous integration now runs a production build. Nothing previously
  exercised that path.

### Changed

- The management-panel account is configurable through `MANAGEMENT_PANEL_EMAIL`
  instead of a company address hardcoded in nine files, so the platform can be
  self-hosted without editing source.
- Removed `typescript.ignoreBuildErrors`. The build passes without it.
- The AI service job runs on Python 3.11, matching the container image, and lints
  with ruff.

### Documentation

- Added a deployment guide, a Docker Compose stack and a container image for the
  web platform. The project previously could not be deployed by a reader.
- Added `docs/EVALUATION.md` with forecast accuracy against a seasonal-naive
  baseline, including that fine-tuning did not improve on the zero-shot model.
- Added `docs/PRIVACY.md`, `ROADMAP.md`, `NOTICE`, issue and pull request
  templates, `CODEOWNERS` and a Dependabot configuration.
- The README status table now separates what is live from what runs on simulated
  data, and documents `AI_SERVICE_URL` along with 27 other variables that were
  undocumented.
- Removed an architecture document describing a different product.

## [0.1.0] — 2026-07-30

First tagged release. Facility assessment platform, resilience scoring, AI
climate forecasting on NASA POWER data, predictive maintenance, advisory layer,
and the public de-identified resilience feed.

[0.1.0]: https://github.com/ubuntuafyalink/afyasolar/releases/tag/v0.1.0
