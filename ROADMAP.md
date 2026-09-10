# Roadmap

What we are building next, in the open. Updated as work lands; the
[status table in the README](./README.md#status) is the record of what is
already true.

Effort is rough: S is up to two days, M up to a week, L up to three weeks.

## Now

Work in flight or starting immediately.

| Item | Why it matters | Effort |
|---|---|---|
| Replace mock-backed admin analytics with real aggregation | Several admin surfaces render from in-memory arrays. Until they compute from `payments`, `devices`, `subscriptions` and efficiency tables, the numbers an administrator sees are not the numbers the platform holds. | L |
| Badge every remaining demo-data surface | A `DemoDataBadge` exists and is used in 19 places, but the demo dataset is imported by 54 modules, including report generation. Anything showing simulated values should say so. | M |
| Real telemetry into predictive maintenance | The models are trained on synthetic data and the serving path simulates its own input window. This is the single largest gap between what the AI service claims and what it demonstrates. | L |
| Integration and end-to-end tests | Coverage today measures pure helpers only. None of the 200-plus route handlers are tested. | L |

## Next

| Item | Why it matters | Effort |
|---|---|---|
| MQTT broker and per-vendor Modbus adapters | The ingest endpoint, contract schema and device token all exist. What is missing is the field side, across 13 sites. | L |
| Resolve the MySQL versus Postgres decision | `TECH_STACK.md` carries an open architecture decision record. A deployer cannot know which database the project will require. | S |
| Publish an OpenAPI schema for the web API | The AI service generates one; the Next.js API does not. A published schema is what makes the platform integrable. | M |
| Schema and data dictionary for the open resilience feed | The feed is live and de-identified but has no published field documentation, which limits its usefulness as open data. | S |
| Swahili user interface | The product is Swahili-first by design and the dictionary exists. Coverage is incomplete. | M |
| Authentication and rate limiting on the AI service | Its endpoints are currently open, and the advisory route proxies to a paid model API. It must stay on a private network until this lands. | M |

## Later

| Item | Why it matters |
|---|---|
| Carbon dMRV | Verified avoided emissions, with a cited Tanzanian grid emission factor rather than a hardcoded constant. |
| Energy-efficiency measurement and verification, IPMVP Option C | Claimed in the architecture figure, not yet built. |
| Data protection impact assessment | Named as open work in [`docs/PRIVACY.md`](./docs/PRIVACY.md). |
| Self-service data export and deletion | Export is currently an administrator function only, so individual rights requests are serviced by hand. |
| Digital Public Goods registry submission | Once the documentation, privacy and deployment gaps above are closed. |

## How this is decided

Priorities are set by the maintainer, described in
[`GOVERNANCE.md`](./GOVERNANCE.md). Anyone may propose a change by opening an
issue. Items that remove a correctness risk or an overstated claim come before
items that add surface area.

Detailed, file-level engineering plans for the admin panel live in
[`web-platform/IMPLEMENTATION_ROADMAP.md`](./web-platform/IMPLEMENTATION_ROADMAP.md).
