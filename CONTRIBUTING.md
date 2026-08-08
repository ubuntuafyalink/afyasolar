# Contributing to AfyaSolar Intelligence

Thank you for your interest in AfyaSolar Intelligence — an open-source climate-resilience and
energy-intelligence platform for health facilities, developed by **Ubuntu Afyalink Company
Limited**. Contributions of all kinds are welcome: bug reports, documentation, tests, and code.

## Ground rules

- Be respectful. This project follows the [Code of Conduct](./CODE_OF_CONDUCT.md).
- **Never commit secrets.** Real credentials live only in a local, git-ignored `.env`. Use
  `.env.example` as the template. If you find a secret in the repo or an issue, report it
  privately per [SECURITY.md](./SECURITY.md) — do not open a public issue.
- Keep changes additive and focused. Small, reviewable pull requests are preferred.

## Development setup

```bash
git clone <repo-url>
cd afyasolar
npm install                 # Node 20 LTS
cp .env.example .env         # then fill in local values (DB_*, NEXTAUTH_SECRET, ...)
npm run db:migrate
npm run dev                  # http://localhost:3000
```

See the "Getting started" section of the [README](./README.md) for the full flow.

## Before you open a pull request

Run the same checks our CI runs (see `.github/workflows/ci.yml`):

```bash
npm run lint
npm run type-check
npm run test
```

- Add or update **unit tests** for any behavior you change. Pure logic (scoring, climate
  normalization, rules, carbon math) must be covered. The mid-project coverage target is
  **≥80%**.
- Keep the public API and database contracts backward-compatible where possible; telemetry
  and messaging contracts are **versioned and additive-only**.

## Commit & PR conventions

- Use clear, imperative commit messages (e.g. `feat: add open resilience data API`).
- Describe **what** changed and **why** in the PR body; link any related issue.
- One logical change per PR.

## Reporting bugs & requesting features

Open a GitHub issue with steps to reproduce (for bugs) or a clear use case (for features).
For anything security- or data-protection-related, follow [SECURITY.md](./SECURITY.md) instead.

## License of contributions

By contributing, you agree that your contributions are licensed under the project's
[MIT License](./LICENSE).
