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

Layered system figures are in [`docs/architecture/`](docs/architecture/).

## Status

| Live today | Planned |
|---|---|
| Facility assessment platform, roles & auth | Device telemetry ingestion (MQTT + Modbus gateway, 13 sites) |
| Resilience scoring (CRiPHC → RCS 0–100) | Public real-time open-data API (anonymised feed) |
| AI climate forecast, hazards & solar yield | Carbon dMRV (verified avoided emissions) |
| Predictive maintenance (RUL + anomaly), LLM advisory & explainer | Energy-efficiency M&V (IPMVP Option C) |
| Facility & portfolio dashboards, SMS notifications | |

The database schema for device telemetry exists; the ingestion path is not yet built.

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
Groq for the advisory layer), our own fine-tuned model and training dataset
published on Hugging Face, and a committed public, de-identified resilience data
API (planned — see Status above). Governance and contribution guidelines are at
the repository root and apply to both projects.

Note on model licensing: the code is MIT, but the fine-tuned climate weights are a
derivative of Apache-2.0 `chronos-bolt-small` and are redistributed under
Apache-2.0 — see [`ai-service/README.md`](ai-service/README.md).

Prepared for the UNICEF Venture Fund (Climate). See each project's README for
capability detail and roadmap.
