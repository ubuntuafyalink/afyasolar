# AfyaSolar — Admin Panel Implementation Roadmap

**Scope: ADMIN PANEL ONLY.** This roadmap is focused exclusively on making every
admin-level feature real (DB-backed), working end-to-end, and well integrated.
Facility/NGO/district/investor/public/ML/IoT surfaces are out of scope here except
where they are the admin-facing slice of an admin feature.

Each item: **Goal → Tasks → Acceptance**, with file paths and rough effort
(S ≤ 2d, M ≤ 1w, L ≤ 3w). Status: ✅ done · 🟡 partial/seeded · ⛔ stub/missing.

## The admin surface (what "admin panel" covers)
- **Core admin** (`src/app/dashboard/admin/*`, `src/components/dashboard/admin-dashboard.tsx`):
  overview, facilities, users, equipment, tools.
- **Resilience Intelligence** (`src/components/admin/intelligence/*`) — ✅ real (shipped:
  16 sections + climate alert engine).
- **Afya Solar admin workspace** (`src/app/afya-solar/admin/page.tsx`, `src/app/api/afya-solar/admin/*`):
  dashboard, services, packages, subscribers, invoice requests, meters, energy,
  financial, support, contracts, system admin.
- **Admin solar ops** (`src/components/admin/*`, `src/app/api/admin/solar/*`): live
  monitoring, alerts, maintenance, performance, energy reports, carbon credits.
- **Admin finance/ops APIs** (`src/app/api/admin/*`): overview, transactions,
  withdrawals, referrals, bulk-sms, notifications, payg-financing, carbon-credits,
  analytics, facilities/comprehensive, afya-solar/assessment-snapshot-summary.

---

## Phase A0 — Persist & complete admin backends (data integrity) · ~2–3 weeks

Several admin surfaces look complete but are backed by in-memory mock arrays or
hardcoded analytics. Make them real first.

- **A0.1 Afya Solar admin sub-panels → DB** (L) — replace in-memory mocks in
  `afya-solar/admin/system/{users,logs,config}`, `.../support/{tickets,metrics}`,
  `.../contracts`, `.../analytics` with real Drizzle tables + queries (keep response
  shapes). *(In progress / first agent.)*
- **A0.2 Admin analytics → real aggregation** (M) — `api/admin/analytics/performance/metrics`
  and `.../efficiency/score` return hardcoded arrays; compute from `payments`,
  `devices`, `subscriptions`, `facilityEfficiencyDaily`, assessment snapshots.
- **A0.3 Afya Solar contract automation** (M) — implement the TODOs in
  `afya-solar/client-services/route.ts` (+ `[id]`): auto-create contract on plan
  selection / activation, handle termination; surface in the admin Contracts tab.
- **A0.4 System alerts real** (S) — `api/system/alerts` mock-statistics fallback →
  real system state for the admin overview.

**Acceptance:** no `mock*` arrays in any admin API route; admin actions persist
across restart; every admin KPI/number traces to a source table.

---

## Phase A1 — Admin intelligence accuracy · ~2–3 weeks

The admin Resilience Intelligence + assessment views are real, but the underlying
climate→RCS link is fragmented, so admin numbers can understate real risk.

- **A1.1 Persist NASA hazards** (M) — write real NASA exposure into
  `facilityClimateProfile` (dataSource="real"), reusing
  `src/lib/climate/portfolio-climate-server.ts` (`computePortfolioClimate`).
- **A1.2 HES from real climate in saved RCS** (M) — derive the HES dimension from the
  real CVI in `api/assessment-cycles/[cycleId]/climate` so the admin
  assessment-snapshot-summary + portfolio RCS reflect real exposure.
- **A1.3 Version + snapshot** (S) — add `formulaVersion` to `climateScoreSummaries`;
  persist monthly `facilityResilienceSnapshot` so admin trend lines are real history.
- **A1.4 Schedule the climate alert scan** (S) — run the shipped
  `api/admin/intelligence/generate-alerts` on a cron (like `api/admin/health-check`)
  so the admin alerts console fills automatically, not only on the button.

**Acceptance:** admin portfolio RCS/tier reflect real NASA exposure; scores are
versioned; trend lines come from stored snapshots; alerts generate on schedule.

---

## Phase A2 — Admin solar operations real · ~3–4 weeks

Make the admin solar-monitoring surfaces operate on real device/telemetry data
instead of simulation.

- **A2.1 Live monitoring / performance / energy reports** (L) — point
  `admin-solar-live-monitoring` and related components at real `deviceHealth` /
  `deviceTelemetry` / `energyData` (already real when present); gate
  `use-simulated-telemetry` behind a demo flag.
- **A2.2 Maintenance console** (M) — wire admin maintenance views to the real
  `maintenance*` tables (requests, visits, quotes, reports).
- **A2.3 Carbon credit verification workflow** (M) — admin UI to review pending
  `carbonCredits` and verify/certify (verificationStatus pending→verified→certified)
  + issue certificate id. Builds on `api/admin/carbon-credits`.
- **A2.4 Meters/relay control** (M) — confirm the admin meters tab (smartmeters,
  meter-commands, relay-actions) performs real, audited commands.

**Acceptance:** admin solar dashboards show real device state; carbon credits move
through a real verification workflow; meter commands are real + logged.

---

## Phase A3 — Admin completeness & integration · ~3–4 weeks

Unify the three admin workspaces and fill the admin-management gaps.

- **A3.1 Role & user management** (L) — admin can create/assign all roles
  (technician, and the investor/NGO/district roles) and manage facility users from
  one place; back it with the real `users`/`technicians` tables.
- **A3.2 Workspace integration** (M) — make core admin, Afya Solar admin, and
  Resilience Intelligence feel like one product: consistent nav, cross-links (a
  facility row links across workspaces), shared facility picker.
- **A3.3 Admin audit log** (M) — record who did what (config changes, verifications,
  alert resolutions, role grants) in a real audit table; surface in System Admin.
- **A3.4 Admin i18n (EN/SW)** (L) — wrap admin routes in the i18n provider + extend
  `dictionaries.ts` so the admin panel is bilingual like the facility dashboard.

**Acceptance:** admins manage every role/user; the three workspaces interlink; all
significant admin actions are audit-logged; admin UI switches EN↔SW.

---

## Phase A4 — Admin hardening · ~2 weeks

- **A4.1 Tests** (L) — Vitest for admin pure logic (`admin-portfolio-real.ts`,
  `climate-alert-rules.ts`, analytics aggregations, A0.x queries); Playwright smoke
  for admin login + each workspace.
- **A4.2 Auth + RBAC review** (S) — confirm every `api/admin/*` and
  `api/afya-solar/admin/*` route enforces `session.user.role === "admin"`.
- **A4.3 Performance** (M) — pagination/indexing for large portfolios; cache the NASA
  portfolio loop result; verify dashboards stay fast at 30+ facilities.

**Acceptance:** admin test suite green in CI; no unguarded admin route; admin
dashboards performant at target scale.

---

## Sequencing summary (admin-only)

| Phase | Theme | Effort |
|---|---|---|
| A0 | Persist admin mock backends + analytics + contracts | ~2–3w |
| A1 | Admin intelligence accuracy (climate↔RCS, scheduled alerts) | ~2–3w |
| A2 | Admin solar ops real (monitoring, carbon verification, meters) | ~3–4w |
| A3 | Admin completeness (roles, workspace integration, audit, i18n) | ~3–4w |
| A4 | Admin hardening (tests, RBAC, performance) | ~2w |

**Do first:** A0 (persistence) then A1 (intelligence accuracy) — they remove the
biggest correctness risks in the admin panel and everything else builds on them.

> Already shipped: admin Resilience Intelligence wired to real data (16 sections) +
> the climate alert generation engine.
