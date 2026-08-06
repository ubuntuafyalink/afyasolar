# AfyaSolar Intelligence — Project Overview

> **Read this first.** This document is the single source of truth for *what we are building,
> why, what already exists, and what is expected to be built.* It is written for both human
> contributors and AI coding assistants. For **how** to build it (the technology stack and
> engineering standards), see [`TECH_STACK.md`](TECH_STACK.md).
>
> **Last updated:** 2026-05-29 · **Phase:** v2 — open-source readiness

---

## 1. One-paragraph summary

**AfyaSolar Intelligence** is an **open-source (MIT)** decision-intelligence platform that turns
facility, energy, and climate data into actionable intelligence for protecting children's health
services in Tanzania. It ingests facility-level inputs — device inventories, outage history,
hazard exposure, service criticality, and operational behavior — and computes a composite
**Resilience Capacity Score (RCS, 0–100)** across five dimensions. It identifies which
child-services are about to fail (vaccine cold-chain, maternity, neonatal care, diagnostics,
water pumping), generates **ranked adaptation plans with expected resilience gain**, and
visualizes risk through dashboards built for clinics, NGOs, district health offices, and funders.
Built and validated in Tanzania; designed to scale across East Africa.

---

## 2. The problem we address

### Strategic framing
- **Area 1 — Strategic Planning:** optimize resource allocation for resilient infrastructure and
  local government / community preparedness.
- **Area 3 — Health Care readiness:** shift from *reactive crisis management* to *proactive,
  localized surge planning.*

### The Tanzania context
Tanzania has **~11,000 primary health facilities** serving children, mothers, and infants. Most
experience power outages **1–2 times daily, lasting 2–3 hours**. When the lights go out:
- vaccines spoil in cold-chain refrigerators,
- mothers deliver by torchlight,
- microscopes go dark mid-diagnosis,
- digital health records become inaccessible.

Climate shocks — floods, heatwaves, storms — are intensifying these failures, especially in rural
and peri-urban facilities serving the most vulnerable children. Yet facility managers, district
health offices, NGOs, and funders have **no affordable, data-driven tool** to identify which
facilities are most at risk, which child-services are about to fail, or how to prioritize limited
resilience investments. **Decisions are made on intuition, not evidence. Children pay the price.**

---

## 3. The solution

AfyaSolar Intelligence answers three questions with evidence:

1. **Which facilities are most at risk?** → the RCS (0–100) ranks a portfolio.
2. **Which child-services are about to fail?** → criticality + fragility analysis flags
   cold-chain, maternity, neonatal, diagnostics, and water pumping.
3. **Where should limited resilience money go first?** → ranked adaptation plans, each with an
   expected resilience gain.

**Business model:** the entire scoring methodology, data schema, assessment workflow, dashboard
templates, and codebase are released under **MIT license**. Revenue comes from **assessments,
deployments, training, and implementation support** — not from the software itself. This is a
**digital public good** with a services business around it.

---

## 4. The scoring framework (the heart of the product)

The platform implements the **CRiPHC** framework. A composite **Resilience Capacity Score
(RCS, 0–100)** rolls up five weighted dimensions:

| Code | Dimension | Captures |
|---|---|---|
| **HES** | Hazard Exposure Score | Exposure to floods, heatwaves, storms, and other climate hazards. |
| **CSF** | Critical Service Fragility | How exposed child-critical services (cold-chain, maternity, neonatal, diagnostics, water) are to power loss. |
| **ECPQ** | Energy Continuity & Power Quality | Outage frequency/duration, backup adequacy, power-quality issues. |
| **EDC** | Efficiency & Demand Control | Energy efficiency and the ability to manage/shed demand. |
| **RRC** | Readiness & Response Capacity | Emergency procedures, staff readiness, response capability. |

Two engines work together, and **both must remain transparent, versioned, and auditable**:
1. A **composite multi-criteria scoring model** (the five dimensions → RCS).
2. A **rules-and-formulas recommendation engine** that ranks risks and generates adaptation
   packages.

> **Why rules-based, not ML (today):** it is explainable, auditable, and locally adaptable —
> essential properties for healthcare decision-making. ML is a *later* layer (see §7), never a
> replacement for the auditable decision path. **Do not move scoring logic into an ML model or an
> LLM.** See `TECH_STACK.md` §6.

---

## 5. Current technical status (what already exists)

AfyaSolar Intelligence is a **working MVP deployed and validated across 13 primary health
facilities in Tanzania.** Two modules are live:

- **Energy Efficiency Assessment** — captures device inventories, outage profiles, grid & diesel
  costs, and operational behavior; produces energy demand, solar sizing, and efficiency outputs.
- **Climate Resilience Assessment** — implements the full CRiPHC framework (HES, CSF, ECPQ, EDC,
  RRC, RCS), generates top risks, and outputs ranked adaptation plans.

Operational dashboards are live for **facility managers** and **portfolio reviewers**.

### Where it lives in this codebase (for agents)
The MVP is **already built** — v2 is a refactor-and-extend, **not** a greenfield build. Key areas:
- Scoring & assessment logic: `src/lib/efficiency-climate/`, `src/lib/intelligence/`
- Assessment APIs: `src/app/api/assessment-cycles/`, related routes under `src/app/api/`
- UI: `src/components/climate/`, `src/components/efficiency/`, `src/components/intelligence/`
- Data model: `src/lib/db/schema.ts` (assessment cycles, climate score summaries, risk drivers,
  recommendation items, etc.)

> The platform began as a broader healthcare-facility **solar services** product (subscriptions,
> financing, maintenance, microgrid billing). v2 re-centers it on **resilience intelligence** and
> open-source release. Some commercial v1 modules may be deprecated or abstracted — confirm scope
> before removing.

---

## 6. Results so far (13 facilities)

**Quantitative**
- Every facility scored on the RCS (0–100).
- Critical-load gaps identified across **all 13 sites**, predominantly affecting **child
  cold-chain and maternity** services.
- **8 of 13 (62%)** facilities are women-led or maternity-serving.
- Financed deployments: **93% on-time payments, zero defaults.**

**Qualitative**
- Facility managers report the assessment surfaced risks they had not identified themselves —
  diesel dependency, unprotected critical loads, inadequate emergency procedures.
- NGO partners and faith-based health networks have confirmed demand for **portfolio-level
  deployment of the open-source toolkit at scale.**

---

## 7. 12-month targets & milestones

| Period | Targets |
|---|---|
| **Months 1–3** | Refactor codebase & publish under **MIT** on public GitHub; deploy real-time **public reporting dashboard**; release **Swahili** UI; publish **methodology, data schema, contribution guidelines**; onboard first external contributors. |
| **Months 4–6** | Pilot with **10 additional facilities** across two regions; integrate **NASA POWER & ERA5** climate datasets; publish a **peer-reviewable methodology paper**; begin **Ministry of Health & UNICEF Tanzania** engagement. |
| **Months 7–9** | Release **IoT telemetry integration**; build **ML risk-prediction module**; release **accessibility & offline** support; publish **open-source toolkit v1.0**. |
| **Months 10–12** | Validate scoring across **30 facilities** total; release **district-level portfolio analytics**; onboard NGO & faith-based deployments; document **UNICEF scale-up roadmap**. |

### How the technology serves these targets
Data science + rule-based decision logic **today**; a machine-learning roadmap **later**. In
Months 7–12, integrate ML for **predictive facility-failure scoring** using outage telemetry,
climate hazard data (NASA POWER, ERA5), and longitudinal facility performance data. Also explore
**offline-capable inference** for low-connectivity rural settings, **multilingual support
(Swahili first)**, and **accessibility** features for users with disabilities.

> ML, live IoT, and ERA5 are **later-phase**. Without real data and hardware they are stubs — do
> not pull them into the early open-source-readiness sprint. See `TECH_STACK.md` §4.

---

## 8. What is expected to be built (v2 work items)

Derived from the milestones above. Detailed tech choices for each live in `TECH_STACK.md`.

**Open-source readiness (Months 1–3 — the immediate sprint)**
- Refactor for **MIT release**: remove secrets, scrub git history, license headers, decouple
  proprietary services behind interfaces, clean config.
- **Methodology + data-schema documentation** extracted from the real scoring code.
- **Contribution guidelines** and governance files (`CONTRIBUTING`, `CODE_OF_CONDUCT`,
  `SECURITY`, issue/PR templates).
- **Swahili i18n** of core flows (next-intl).
- **Real-time public dashboard** (read-optimized, fast on slow networks).
- **API-layer hardening** across existing routes (auth checks, Zod validation, rate limiting,
  error handling).
- **Test suite for the scoring engine** + CI (GitHub Actions); remove `ignoreBuildErrors`.
- **Docker / docker-compose** for one-command self-hosting.

**Data & analytics (Months 4–6)**
- **NASA POWER + ERA5** climate dataset integration.
- District-level analytics groundwork.

**Intelligence & field (Months 7–12)**
- **IoT telemetry ingestion** (MQTT + HTTP → time-series store).
- **ML risk-prediction** module (classical, explainable; SHAP).
- **Accessibility (WCAG 2.1 AA) + offline** support.
- **District-level portfolio analytics** module.

---

## 9. Who uses it (audiences)

- **Facility managers** — see their own facility's RCS, failing services, and recommended actions.
- **District health offices** — portfolio/district view to prioritize across many facilities.
- **NGOs & faith-based health networks** (e.g. CSSC) — portfolio-level deployment & monitoring.
- **Funders** — evidence to direct limited resilience investment.
- **The public** — a real-time public reporting dashboard (transparency).

---

## 10. Partners & advisors

- **13 health facilities** — deployment partner with a **signed MoU** for assessment & field
  validation.
- **Christian Social Services Commission (CSSC)** — Tanzania's largest faith-based health network
  (hundreds of dispensaries, clinics, hospitals); engagement initiated for portfolio-level
  deployment.
- **Medical Credit Fund** — financing for facilities that cannot afford upfront costs.
- Active outreach across dispensaries, polyclinics, and primary health centers in **Dar es
  Salaam, Pwani, and Morogoro** regions.
- **Advisors** being onboarded across AI, climate resilience, child health, and open-source
  digital public goods.

---

## 11. Guiding principles for anyone building this

1. **Children's services are the point.** Every feature should trace back to protecting a
   child-critical service. When prioritizing, ask: *does this help a manager/funder act before a
   service fails?*
2. **Explainability over cleverness.** The decision path must be auditable. See `TECH_STACK.md`.
3. **Built for rural Tanzania.** Assume bad networks, outages, low-end devices, Swahili speakers.
4. **Open-source as a public good.** Others must be able to read, audit, self-host, and contribute.
5. **Evolve, don't rewrite.** A validated MVP exists. Harden and extend it.

---

*Companion documents: [`TECH_STACK.md`](TECH_STACK.md) (how we build) · `README.md` (setup) ·
`docs/` (platform & methodology references). When any document contradicts this file or the
code, trust this file and the code.*
