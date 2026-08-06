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
                        NASA POWER (open climate data)
                                    │
                                    ▼
┌──────────────────┐   HTTP    ┌──────────────────────────────────────┐
│  web-platform/   │ ────────► │  ai-service/  (FastAPI)               │
│  Next.js app     │           │  • climate forecast (Chronos)         │
│  UI · API · DB   │ ◄──────── │  • hazards + solar yield              │
│  auth · payments │  JSON     │  • predictive maintenance (RUL, anom) │
└──────────────────┘           │  • LLM advisory                       │
                               └──────────────────────────────────────┘
```

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
├── .github/workflows/     CI (one job per project, path-scoped)
├── LICENSE                Apache-2.0 (covers both projects)
├── CONTRIBUTING.md · GOVERNANCE.md · SECURITY.md · CODE_OF_CONDUCT.md
└── README.md              (this file)
```

## Open source & DPG

Licensed **Apache-2.0**. Built as a Digital Public Good candidate: open data
(NASA POWER), open-weights models (Chronos-Bolt, Groq), and a public,
de-identified resilience data API. Governance and contribution guidelines are at
the repository root and apply to both projects.

Prepared for the UNICEF Venture Fund (Climate). See each project's README for
capability detail and roadmap.
