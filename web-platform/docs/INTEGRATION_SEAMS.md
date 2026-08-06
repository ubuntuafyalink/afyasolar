# Integration Seams & Deferred-Work Roadmap

This document describes the **extension points** that were deliberately built into
AfyaSolar so that hardware, telco, and machine-learning integrations can be added
later without re-architecting the platform. Each seam is small, typed, and
unit-tested today; the "drop-in path" section for each explains exactly what a
future contributor adds to go live.

It is written for reviewers evaluating how the roadmap items map onto real code,
and for contributors picking up the deferred work. Nothing here requires a live
external account or device to read, test, or extend.

> Honesty note: where a capability is a **skeleton** (interface present, live
> provider not wired) it is labelled as such. We do not stub non-functional code
> into request paths and present it as working.

---

## 1. Device telemetry ingestion (spec §8.1 / §8.2)

**What exists now**

- A documented JSON telemetry contract, validated with Zod:
  `deviceGatewayContractSchema` in `src/lib/validations/telemetry.ts`
  — `{ facility_id, ts, load_w, pv_w, batt_v, batt_soc, grid_present, temp_c }`.
- A pure mapper `mapGatewayContractToTelemetry(contract, deviceId)` that converts
  the wire contract into the internal telemetry row shape (W → kW, `grid_present`
  → `gridStatus`, `firmwareVersion: "gateway"`), plus `parseContractTs()`.
- A device-token auth guard in `src/lib/auth/device-token.ts`
  (`extractBearerToken`, `isValidDeviceToken` — fail-closed, constant-time-ish).
- `POST /api/devices/telemetry` accepts a `Bearer ${DEVICE_INGEST_TOKEN}` header
  (device path) **in addition to** the existing browser-session path, validates
  the body against the contract, inserts the row, and runs health/alert updates.

**Tested by** `src/lib/validations/telemetry.test.ts`, `src/lib/auth/device-token.test.ts`.

**Drop-in path for live inverters (deferred)**

A per-vendor adapter (DESS / Solarman / Growatt / Victron) is a function that
polls or receives the vendor's data and emits `DeviceGatewayContract` objects,
then POSTs them to `/api/devices/telemetry` with the ingest token — or calls
`mapGatewayContractToTelemetry` directly in-process. No route or schema change is
required; the contract is the stable boundary. Modbus/MQTT bridges terminate at
the same contract.

---

## 2. Messaging channel abstraction (spec §5.3 / §8.6)

**What exists now**

- A provider-agnostic interface `SmsChannelAdapter` in
  `src/lib/messaging/channel.ts` (`send(msg: OutboundSms): Promise<ChannelResult>`).
- `SmartSmsAdapter` — wraps the existing SmartSMS logic and remains the **default**
  (behaviour unchanged).
- `AfricasTalkingAdapter` — an env-gated **skeleton** (`AFRICASTALKING_*`); it
  throws a clear "not configured" / "not implemented" error if selected without
  credentials, so the seam is real and unit-testable without a live account.
- `resolveSmsChannel(provider)` selects an adapter from the `SMS_PROVIDER` env var.

**Tested by** `src/lib/messaging/channel.test.ts`.

**Drop-in path for Africa's Talking / USSD / Voice (deferred)**

Implement the body of `AfricasTalkingAdapter.send()` against the AT REST API,
set `SMS_PROVIDER=africastalking` plus the `AFRICASTALKING_*` env vars, and it
becomes the active channel with no caller changes. USSD and Voice handlers are
new routes that reuse the same adapter registry.

---

## 3. Climate forecast / anticipatory signal (spec §6.4 / §8.3)

**What exists now**

- `src/lib/climate/open-meteo.ts` — `normalizeOpenMeteoForecast()` maps the free,
  keyless Open-Meteo forecast into the **same** heat/flood/storm/drought 0..100
  hazard vocabulary used by the NASA POWER baseline, plus `openMeteoUrl()`.
- `GET /api/climate/open-meteo?lat=&lon=` — a cached (6h) server proxy.
- Trend detection upgraded from a ±5 deadband heuristic to a real Mann-Kendall
  test + Sen's slope (`src/lib/climate/stats/mann-kendall.ts`).

**Tested by** `src/lib/climate/open-meteo.test.ts`, `src/lib/climate/stats/mann-kendall.test.ts`.

**Drop-in path (deferred)**

The near-term forecast is additive to the NASA baseline. Anticipatory-action
rules can compare the forecast hazard indices against the baseline to trigger
alerts; the existing `climate-alert-rules` engine already consumes the shared
hazard vocabulary, so wiring is a rules change, not a data-model change.

---

## 4. Public open-data API (spec §8.8 / §10, Appendix A)

**What exists now**

- `GET /api/open/resilience` — public, unauthenticated, **de-identified** feed.
- `buildOpenResilienceFeed()` in `src/lib/climate/open-resilience-feed.ts`
  aggregates by region, **excludes degraded facilities**, and emits **no**
  facility id/name/coordinates. A unit test asserts identifiers never leak.
- Cache + CORS headers set for a public, high-availability endpoint.

**Tested by** `src/lib/climate/open-resilience-feed.test.ts` (incl. the no-leak assertion).

**Drop-in path (deferred)**

DPG registration and the formal open-data catalogue entry reference this
endpoint. Additional aggregated dimensions can be added to
`buildOpenResilienceFeed` provided the de-identification invariant holds (the
test enforces it).

---

## Deferred work summary

| Area | Seam in place | Remaining (needs account / hardware / net-new) |
|------|---------------|------------------------------------------------|
| Inverter telemetry | Contract + ingest endpoint + token | Per-vendor adapters, real 13-site credentials |
| Messaging | Channel interface + AT skeleton | AT live wiring, USSD/Voice handlers |
| Forecast | Open-Meteo normalizer + proxy | Anticipatory-action rules |
| ML / analytics | Shared hazard vocabulary, telemetry store | Python sidecar (RUL, anomaly, SHAP), NILM, MQTT broker |
| Open data / DPG | De-identified public endpoint | DPG registry submission, catalogue entry |

See `IMPLEMENTATION_ROADMAP.md` for the phased delivery plan and
`docs/SIMPLIFIED_SYSTEM_ARCHITECTURE.md` for the overall system diagram.
