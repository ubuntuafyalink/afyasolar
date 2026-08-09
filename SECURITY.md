# Security Policy

## Reporting a vulnerability

If you discover a security vulnerability, a leaked secret, or a personal-data exposure in
AfyaSolar Intelligence, **please report it privately. Do not open a public GitHub issue or
pull request**, and do not include any secret values or personal data in your report.

Use either channel:

- **Email the maintainer:** **info@ubuntuafyalink.co.tz** (Ubuntu Afyalink Company Limited).
- **GitHub private vulnerability reporting:** the repository's *Security → Report a
  vulnerability* tab, which opens a private advisory visible only to the maintainers.

Include: a description of the issue, steps to reproduce, affected components/paths, and the
potential impact. Please give us a reasonable window to respond and remediate before any
public disclosure.

We will acknowledge receipt, investigate, and keep you informed of remediation progress.

## Handling secrets

- **No secrets are ever committed to the repository.** Real credentials live only in a local,
  git-ignored `.env` file. `.env.example` documents the required keys with placeholder values.
- `.gitignore` excludes `.env` and `.env.*` (except `.env.example`). If you believe a real
  secret has been committed, report it privately (above) so it can be rotated and purged.
- Required environment variables are validated at runtime via
  `web-platform/src/lib/env.ts`; the AI service reads its own git-ignored `ai-service/.env`.

## Data protection (children as a vulnerable population)

This platform serves health facilities and handles data that can be sensitive. We follow:

- **Tanzania Personal Data Protection Act (2022)** and **UNICEF's Policy on Personal Data
  Protection / UN standards for vulnerable populations.**
- **Data minimization & consent** — collect the minimum necessary; process personal data on a
  lawful basis.
- **De-identification** — the public open-data API exposes only aggregated / de-identified
  facility-resilience data, never personally identifiable information.
- **Residency** — the stack is self-hostable so data can remain in-country; the local
  telemetry-gateway path keeps device data in-country by design.
- **Standard hygiene** — least-privilege database users, TLS in transit, audit logging, and
  signed device provisioning.

## Supported versions

The project is pre-1.0; security fixes are applied to the `main` branch and included in the
next tagged release.
