# Roadmap

What we are building next. The [status table in the README](./README.md#status)
records what is already delivered; this is the forward plan.

Effort is indicative: S is up to two days, M up to a week, L up to three weeks.

## Now

In flight or starting immediately.

| Deliverable | Outcome | Effort |
|---|---|---|
| Database-backed admin analytics | Admin performance and efficiency surfaces compute from `payments`, `devices`, `subscriptions` and the efficiency tables, replacing the seeded views used during development. | L |
| Complete demo-data labelling | Extend the existing `DemoDataBadge` to every surface that renders sample values, so provenance is visible on all 54 consumers rather than the 19 covered today. | M |
| Live telemetry into predictive maintenance | Feed field data from the pilot sites into the remaining-useful-life and anomaly models, replacing the synthetic training set and the simulated scoring window. | L |
| Integration and end-to-end test layer | Extend automated testing beyond the pure-logic suite to cover API route handlers and the main user journeys. | L |

## Next

| Deliverable | Outcome | Effort |
|---|---|---|
| MQTT broker and Modbus gateway adapters | Complete the field side of device ingestion across the 13 pilot sites. The ingest endpoint, contract schema and device authentication are already in place. | L |
| Database platform decision | Close the open architecture decision record on MySQL versus Postgres, so adopters know what to provision. | S |
| OpenAPI schema for the web API | Publish a machine-readable contract for the platform API, matching what the AI service already generates. | M |
| Published schema for the open resilience feed | Field-level documentation and a data dictionary for the public feed, so it is usable as open data rather than merely available. | S |
| Swahili user interface | Complete translation coverage across the product, which is Swahili-first by design. | M |
| Rate limiting on the AI service | Add request throttling alongside the bearer-token authentication already shipped. | M |

## Later

| Deliverable | Outcome |
|---|---|
| Carbon dMRV | Verified avoided emissions, using a cited Tanzanian grid emission factor. |
| Energy-efficiency measurement and verification | Savings quantified to IPMVP Option C. |
| Data protection impact assessment | Completes the programme described in [`docs/PRIVACY.md`](./docs/PRIVACY.md). |
| Self-service data export and deletion | Lets individuals exercise access and erasure rights directly. |
| Digital Public Goods registry submission | Formal recognition once the documentation and privacy work above lands. |

## How priorities are set

The maintainer sets direction, as described in [`GOVERNANCE.md`](./GOVERNANCE.md).
Anyone may propose a change by opening an issue. Work that improves the accuracy
of what the platform reports takes precedence over new surface area.

File-level engineering plans for the admin panel are in
[`web-platform/IMPLEMENTATION_ROADMAP.md`](./web-platform/IMPLEMENTATION_ROADMAP.md).
