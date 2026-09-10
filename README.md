# AfyaSolar Intelligence

Open-source climate-resilience platform for solar-powered health facilities in
Tanzania. This repository is a **monorepo** holding two independent projects that
run as separate services and talk over HTTP.

| Project | What it is | Stack | Folder |
|---------|-----------|-------|--------|
| **Web platform** | The product: facility management, resilience dashboards, climate intelligence UI, subscriptions & payments, admin | Next.js · TypeScript | [`web-platform/`](web-platform/) |
| **AI service** | Climate forecasting (Chronos on NASA POWER), predictive maintenance (RUL + anomaly), and an LLM advisory layer, served as an API | Python · FastAPI | [`ai-service/`](ai-service/) |

They are deliberately separate: the AI/ML is **not** embedded in the web app — the
platform calls the AI service over HTTP, so each can be developed, tested, and
deployed on its own.

## Architecture

```
        NASA POWER (open climate data)        Hugging Face (open model + dataset)
                    │                                        │
                    ▼                                        ▼
┌──────────────────┐   HTTP    ┌──────────────────────────────────────────┐
│  web-platform/   │ ────────► │  ai-service/  (FastAPI)                   │
│  Next.js app     │           │  • climate forecast (Chronos-Bolt 48M)    │
│  UI · API · DB   │ ◄──────── │  • hazards + solar yield                  │
│  auth · payments │  JSON     │  • predictive maintenance (RUL, anomaly)  │
└──────────────────┘           │  • LLM advisory + explainer               │
                               └──────────────────────────────────────────┘
```

The AI service loads its model and context data either from local files or straight from
Hugging Face at runtime (`AI_ENGINE_MODEL_REPO`, `AI_ENGINE_DATA_REPO`):

| Artefact | Hugging Face repo |
|---|---|
| Climate model (Chronos-Bolt 48M, fine-tuned on East Africa) | [`afyalink/afyasolar-chronos-48m-climate-ea-v1`](https://huggingface.co/afyalink/afyasolar-chronos-48m-climate-ea-v1) |
| Training dataset (NASA POWER, 275-point East-Africa grid, 2000→present) | [`afyalink/afyasolar-nasa-power-east-africa`](https://huggingface.co/datasets/afyalink/afyasolar-nasa-power-east-africa) |

Forecast accuracy against a seasonal-naive baseline is published in
[`docs/EVALUATION.md`](docs/EVALUATION.md), including the finding that
fine-tuning did not improve on the zero-shot model.

The layered system figure is in [`docs/architecture/`](docs/architecture/).

## Status

We label capabilities in three states rather than two, because some are real code
running on real data, some are real code running on simulated data, and some are
not built. A reviewer should be able to tell which is which.

| Live today | Runs on simulated or mock data | Not yet built |
|---|---|---|
| Facility assessment platform, roles & auth | Predictive maintenance (RUL + anomaly) | MQTT + Modbus vendor gateway adapters (13 sites) |
| Resilience scoring (CRiPHC → RCS 0–100) | Several admin analytics surfaces | Carbon dMRV (verified avoided emissions) |
| AI climate forecast, hazards & solar yield | Billing and payment-history views | Energy-efficiency M&V (IPMVP Option C) |
| LLM advisory & explainer | | |
| Public open-data resilience API, de-identified | | |
| Device telemetry ingest endpoint (token-authenticated HTTP) | | |
| Facility & portfolio dashboards, SMS notifications | | |

Notes on the middle column, since these are the easiest claims to overstate:

- **Predictive maintenance** models are trained on synthetic telemetry, and the
  serving path simulates its own input window when no live window is supplied
  (deterministic, seeded by facility id). Responses label the source as
  `simulated` or `provided`. The method is real; the data is not yet.
- **Admin analytics, billing and payment history** render from in-memory arrays
  in several places. The remaining work is tracked in
  [`web-platform/IMPLEMENTATION_ROADMAP.md`](web-platform/IMPLEMENTATION_ROADMAP.md).
  Surfaces that show demo values carry a visible badge.

On telemetry: the ingest endpoint at `POST /api/devices/telemetry` is built. It
authenticates with a device bearer token, validates against a gateway contract
schema, and writes to the telemetry tables. What is missing is the field side —
the MQTT broker and the per-vendor Modbus adapters.

## Getting started

Each project is self-contained with its own README, dependencies, and tests:

- **Web platform** → [`web-platform/README.md`](web-platform/README.md)
  (`cd web-platform && npm install && npm run dev`)
- **AI service** → [`ai-service/README.md`](ai-service/README.md)
  (`cd ai-service && pip install -r requirements.txt && uvicorn app.main:app --reload`)

## Repository layout

```
afyasolar/                 (this repo)
├── web-platform/          Next.js web application
├── ai-service/            FastAPI AI/ML service
├── docs/architecture/     System architecture figures (SVG + PNG)
├── .github/workflows/     CI (one job per project, path-scoped)
├── LICENSE                MIT (covers both projects)
├── CONTRIBUTING.md · GOVERNANCE.md · SECURITY.md · CODE_OF_CONDUCT.md
└── README.md              (this file)
```

## Open source & DPG

Licensed **MIT**. Built as a Digital Public Good candidate: open data
(NASA POWER), open-weights models (Chronos-Bolt for forecasting; Llama served via
Groq for the advisory layer), our own training dataset and fine-tuned weights
published on Hugging Face, and a public, de-identified resilience data API that
is live at `GET /api/open/resilience`. Governance and contribution guidelines are
at the repository root and apply to both projects.

Note on model licensing: the code is MIT, but the fine-tuned climate weights are a
derivative of Apache-2.0 `chronos-bolt-small` and are redistributed under
Apache-2.0 — see [`ai-service/README.md`](ai-service/README.md).
