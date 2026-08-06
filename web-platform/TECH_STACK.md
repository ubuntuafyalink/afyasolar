# AfyaSolar Intelligence — Technology Guide & Engineering Standards

> **Status:** Authoritative. This document governs technology choices across the entire
> AfyaSolar Intelligence codebase (v2). Both human contributors and AI coding assistants
> (e.g. Claude Code) **must** follow it. Propose changes via PR + an ADR entry (see §8),
> never silently.
>
> **Last updated:** 2026-05-29 · **Applies to:** v2 ("AfyaSolar Intelligence")

---

## 1. What we are building (context for every decision)

AfyaSolar Intelligence is an **open-source (MIT)** decision-intelligence platform that turns
facility, energy, and climate data into a composite **Resilience Capacity Score (RCS, 0–100)**
across five dimensions — **HES** (Hazard Exposure), **CSF** (Critical Service Fragility),
**ECPQ** (Energy Continuity & Power Quality), **EDC** (Efficiency & Demand Control), and
**RRC** (Readiness & Response Capacity) — and ranks adaptation actions to protect children's
health services in Tanzanian primary health facilities.

It is a **digital public good**: others must be able to read, audit, self-host, and contribute.

---

## 2. The three filters every technology choice must pass

Every dependency, service, or pattern added to this codebase must be justified against these:

1. **Open-source & self-hostable** — no proprietary lock-in. Mainstream, permissively
   licensed, runnable on a contributor's or an NGO's own infrastructure (data sovereignty
   matters in health). Prefer tools with an open license and a Docker path.
2. **Works in low-connectivity rural Tanzania** — small payloads, offline-tolerant, resilient
   to 2–3h daily outages and thin 3G/4G links. Bandwidth and battery are budgets.
3. **Explainable & auditable** — anything in the *decision path* (scoring, risk ranking,
   recommendations) must be deterministic, versioned, and human-readable. Healthcare
   decisions cannot rest on a black box.

A fourth, practical rule overrides taste: **evolve the existing codebase, do not rewrite it.**
~80% of v1's stack is correct. Default to *keep + harden*; change only with a clear reason
recorded in an ADR.

---

## 3. Canonical stack (use these; do not introduce alternatives without an ADR)

### Frontend
| Concern | Technology | Status | Why |
|---|---|---|---|
| Framework | **Next.js 16** (App Router) | Keep | Server Components ship less JS → critical on slow networks; SSR/SSG for a fast, indexable public dashboard. |
| Language | **TypeScript** (strict) | Keep | Type safety; `ignoreBuildErrors` **must be removed** (see §6). |
| UI library | **React 18** | Keep | — |
| Styling | **Tailwind CSS 4** | Keep | Already in use; small, consistent. |
| Components | **Radix UI / shadcn** | Keep | Accessibility-first primitives (ARIA built in) — foundation for our a11y goal. |
| Charts | **Recharts** | Keep | Sufficient for dashboards. |
| Maps / geospatial | **MapLibre GL** + OpenStreetMap tiles | Add | Open fork of Mapbox; **no token, no paid lock-in**. Used for hazard maps, facility & district views. |
| Internationalization | **next-intl** | Add | App-Router-native, type-safe, ICU format. Swahili first, then English/French for regional scale-up. |
| Offline / PWA | **Serwist** (modern Workbox) + IndexedDB | Add | The single most important rural-context capability: cached assessments survive outages. Builds on v1's existing service worker. |

### Backend
| Concern | Technology | Status | Why |
|---|---|---|---|
| API | **Next.js Route Handlers** (monolith) | Keep | One deployable, easiest for outside contributors. Do **not** split into microservices. |
| Scoring engine (RCS/CRiPHC) | **Plain, versioned TypeScript** | Keep + version | The heart of the product. Must stay deterministic, readable, auditable. Stamp every result with `methodologyVersion`. **Never** move scoring into ML or an LLM. |
| Auth | **NextAuth / Auth.js** (Credentials) | Keep | Open-source, self-hostable, no SaaS lock-in. Clean up the multi-table login model when time allows. |
| Validation | **Zod** | Keep | Validate **all** external input at the API boundary. |
| ORM | **Drizzle** | Keep | Already in use; supports both MySQL and Postgres (survives a DB migration). |

### Database
| Concern | Technology | Status | Why |
|---|---|---|---|
| Primary DB | **PostgreSQL** (target) / MySQL (current) | **Decision pending — see ADR-001 §8** | — |
| Geospatial | **PostGIS** | Add (with Postgres) | Hazard exposure, facility mapping, district roll-ups. No real MySQL equivalent. |
| Time-series (IoT) | **TimescaleDB** | Add (with Postgres) | Telemetry ingestion at scale. |

> **Note:** MySQL (GPL) and TiDB core (Apache-2.0) **are** open-source — the open-source goal
> does *not* by itself require leaving MySQL. The case for Postgres is **PostGIS + TimescaleDB**
> fit for geospatial and time-series work. See ADR-001.

### AI / Data Science
| Concern | Technology | Status | Why |
|---|---|---|---|
| Resilience scoring | **Rules & formulas in TypeScript** | Keep | Explainable, auditable, locally adaptable. The correct choice for healthcare decisions. |
| LLM features (optional) | **Provider-agnostic** (Groq/OpenAI cloud **or** local Ollama) | Make optional | Use only for *narrative summaries of results*, never scoring. Self-hosters must not be forced to buy an API key. |
| Predictive ML (Months 7–12) | **Python: scikit-learn / XGBoost / LightGBM + SHAP**, served via **FastAPI** sidecar | Add later | Tabular data, ~30 facilities ⇒ classical ML, **not** deep learning. SHAP preserves explainability. |
| Climate data (Months 4–6) | **NASA POWER** via REST (Node OK); **ERA5** via Python **xarray / netCDF4** | Add later | ERA5 is NetCDF — Python territory. NASA POWER is a simple REST API. |

### Infrastructure & quality
| Concern | Technology | Status | Why |
|---|---|---|---|
| IoT ingestion (Months 7–9) | **MQTT (Mosquitto)** + HTTP fallback → TimescaleDB | Add later | Lightweight IoT standard for thin rural links. Scaffold the model now; stub until hardware exists. |
| Unit tests | **Vitest** | Add — required | The scoring engine **must** be tested. |
| E2E tests | **Playwright** | Add | Critical user flows. |
| CI/CD | **GitHub Actions** | Add — required | Lint + type-check + tests on every PR. Free for public repos; prerequisite for accepting contributors. |
| Packaging / deploy | **Docker + docker-compose** (primary); Vercel (public demo only) | Add | One-command self-host is the key adoption lever for a DPG. Vendor-neutral on-prem path is mandatory. |
| Error monitoring (optional) | **Sentry** (self-hostable) | Optional | Keep lightweight. |

### Open-source governance (these are part of the stack)
`LICENSE` (MIT) · `CONTRIBUTING.md` · `CODE_OF_CONDUCT.md` · `SECURITY.md` ·
issue & PR templates · semantic versioning · conventional commits.
Without these the repo is *visible*, not *open-source*.

---

## 4. Phasing — what belongs when

- **Now (open-source readiness sprint):** Frontend keep-set, next-intl + Swahili, Serwist/PWA,
  MapLibre, MIT refactor & secret removal, Vitest + Playwright + GitHub Actions, Docker,
  governance files, API hardening, scoring-engine versioning & tests.
- **Months 4–6:** NASA POWER + ERA5 climate integration; district analytics.
- **Months 7–12:** FastAPI + classical ML risk-prediction (with SHAP); MQTT IoT ingestion;
  deeper offline + accessibility.

Do **not** pull later-phase tech (real ML, live IoT, ERA5) into the early sprint — without
data and hardware they are stubs.

---

## 5. Explicitly DO NOT use (and why)

- **Supabase / Firebase as the backend** — re-platforming onto a BaaS discards the existing API
  layer and the self-host story. (The real DB today is MySQL/TiDB + AzamPay — not Supabase, despite
  any older notes you may find.)
- **Vector DB / RAG / LangChain** — there is no document-search problem here. Hype, not a need.
- **Deep learning / neural nets** — far too little data (~30 facilities); produces an
  unexplainable, overfit model for a healthcare decision.
- **Clerk / Auth0 / Mapbox / Google Maps** — proprietary SaaS lock-in; contradicts "digital
  public good."
- **A framework rewrite** (Remix, SvelteKit, standalone Express, etc.) — zero payoff, high risk.

---

## 6. Engineering standards (non-negotiable)

1. **No hidden errors.** Remove `typescript.ignoreBuildErrors` from `next.config.mjs` and fix
   what surfaces. CI fails on type errors and lint errors.
2. **The scoring engine is sacred.** Deterministic, pure functions where possible, fully unit
   tested, versioned (`methodologyVersion`). Any formula change requires a test + an ADR.
3. **Validate all external input** at the API boundary with Zod.
4. **No secrets in code or git history.** Everything via env vars; provide `.env.example`.
   Scrub history before public release.
5. **Abstract third-party services behind interfaces** (payments, SMS/WhatsApp, uploads, LLM)
   so a self-hoster can swap providers.
6. **Performance budget:** assume a slow 3G connection and a low-end Android device. Minimize
   client JS; prefer Server Components; lazy-load maps and charts.
7. **Accessibility:** target WCAG 2.1 AA; keep using Radix; test keyboard + screen-reader paths.
8. **Every user-facing string is translatable** (next-intl) — no hard-coded English.

---

## 7. Read the framework docs before coding

This is a recent Next.js with breaking changes from older training data. Before writing
framework code, read the relevant guide in `node_modules/next/dist/docs/` and heed deprecation
notices (see `AGENTS.md`).

---

## 8. Architecture Decision Records (ADRs)

Record every significant technology decision here. Append, never rewrite history.

### ADR-001 — Primary database: PostgreSQL vs MySQL *(OPEN — needs owner decision)*
- **Context:** v1 runs MySQL (Drizzle) on TiDB Cloud. v2 needs geospatial (hazard/district)
  and IoT time-series capabilities.
- **Options:** (a) Migrate to **PostgreSQL + PostGIS + TimescaleDB** early; (b) stay on MySQL
  and defer geospatial/time-series.
- **Trade-off:** Postgres is the better technical fit for v2's core analytics, but migrating
  ~94 tables + ~191 routes is the largest, riskiest single task (~3–4 days).
- **Recommendation:** If geospatial hazard analysis and IoT time-series are in scope for the
  shipped v2, migrate to Postgres in the foundation phase. If deferred, stay on MySQL for now.
- **Decision:** _pending._

---

*Maintainers: keep this document and the README tech table in sync. If they ever disagree,
this file wins for engineering decisions.*
