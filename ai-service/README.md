# AfyaSolar AI Engine

Standalone **FastAPI** service for AfyaSolar's AI/ML: climate forecasting
(fine-tuned **Chronos** on open **NASA POWER** data) and, next, predictive
maintenance (RUL + anomaly). Kept separate from the Next.js app — the app calls
this service over HTTP instead of embedding Python/ML.

Everything is open and free: NASA POWER (open data), Chronos-Bolt (Apache-2.0),
AutoGluon (Apache-2.0). Deployable free on a HuggingFace Space.

## Design

```
NASA POWER (open daily climate)
      │  pipeline/data/fetch_nasa.py  ->  pipeline/datasets/build_dataset.py
      ▼
  fine-tune Chronos-Bolt (pipeline/train, free Colab GPU)
      │  forecasts RAW variables: irradiance, temp, rain, wind, humidity
      ▼
  FastAPI service (app/)  ── POST /forecast ──►  raw-variable forecasts
      │
      ▼  the Next.js app derives hazards (heat/flood/storm/drought) and
         solar yield from the forecasts using its existing tested logic
```

RUL + anomaly (from synthetic telemetry) and an LLM explanation layer are the
next tracks; they will live under `app/` and `pipeline/` alongside forecasting.

## Layout

```
ai-engine/
├── app/                  FastAPI service
│   ├── main.py           entrypoint (uvicorn app.main:app)
│   ├── config.py         env-overridable paths
│   ├── routers/          health, forecast
│   └── services/         predictor loading (lazy heavy deps)
├── pipeline/             the ML pipeline (data -> datasets -> train -> eval)
│   ├── data/             fetch_nasa.py + locations.json
│   ├── datasets/         build_dataset.py
│   ├── train/            finetune_chronos.py + config.yaml + requirements.txt
│   └── eval/             backtest.py
├── notebooks/            train_colab.ipynb (one-click GPU training)
├── requirements.txt      API + data-pipeline deps (light)
├── requirements-serve.txt  + AutoGluon (to load/run a fine-tuned predictor)
├── Dockerfile            container / HuggingFace Space (port 7860)
└── .env.example
```

## Run the API (no model needed for /health)

```bash
python -m venv .venv && .venv\Scripts\activate   # Windows
pip install -r requirements.txt
uvicorn app.main:app --reload
# http://127.0.0.1:8000/docs   ·   GET /health shows which models are trained
```

`POST /forecast` returns 503 until a fine-tuned model exists under
`pipeline/train/outputs/<horizon>/`. Install `requirements-serve.txt` to enable
actual forecasting.

**Zero local data:** a fresh clone serves full forecasts without copying any
model or data files — set `AI_ENGINE_MODEL_REPO` and `AI_ENGINE_DATA_REPO` in
`.env` (see below) and everything is pulled from HuggingFace and cached. The
first forecast call downloads ~1.5 GB into `~/.cache/huggingface` (minutes);
subsequent calls are instant.

## API endpoints

| Method + path | Purpose | Needs a trained model? |
|---------------|---------|------------------------|
| `GET /health` | liveness + which models are available | no |
| `POST /forecast` | forecast raw NASA variables (Chronos) | yes (climate) |
| `POST /hazards` | heat/flood/storm/drought indices (0..100) from a series | no (pure) |
| `POST /yield` | modeled PV generation from an irradiance series + system kW | no (pure) |
| `POST /maintenance/rul` | battery remaining-useful-life (days) from a telemetry window | yes (RUL) |
| `POST /maintenance/anomaly` | flag anomalous telemetry rows | yes (anomaly) |
| `POST /advisory` | plain-language advisory over the above (LLM or rule-based) | no |

`/hazards` and `/yield` are pure derivations (the app's own logic, ported), so
they work immediately. The main system composes these: forecast -> hazards +
yield -> advisory. Full request/response shapes are at `/docs`.

## Train the models (GPU — free Google Colab)

Easiest: open `notebooks/train_colab.ipynb` and run all cells. Or directly:

```bash
pip install -r pipeline/train/requirements.txt

python pipeline/data/fetch_nasa.py            # open NASA POWER, 34 locations
python pipeline/datasets/build_dataset.py     # daily + monthly Chronos-ready series
python pipeline/train/finetune_chronos.py     # fine-tune Chronos-Bolt (both horizons)
python pipeline/eval/backtest.py              # WQL/MASE vs seasonal-naive baseline
```

Each horizon trains **SeasonalNaive** (baseline) vs **Chronos ZeroShot** vs
**Chronos FineTuned** so the fine-tune's value is provable. Predictors land in
`pipeline/train/outputs/<horizon>/`; the API serves them from there.

### Predictive maintenance (CPU - runs anywhere, no GPU)

Trained on **synthetic telemetry** from a physics-based generator (battery SoH
fade + injected faults), since no live device data exists yet. Retrain on real
telemetry when it arrives - the interfaces do not change.

```bash
python pipeline/synthetic/generate_telemetry.py   # labeled telemetry (RUL + faults)
python pipeline/train/train_rul.py                # XGBoost RUL (+ SHAP / gain importances)
python pipeline/train/train_anomaly.py            # Isolation Forest anomaly detector
```

### LLM advisory (`/advisory`)
Set `LLM_API_KEY` (Groq by default, open-weights) in `.env` to get LLM-written
advisories; without a key it falls back to a deterministic rule-based summary, so
the endpoint always works. See `.env.example`.

### HuggingFace access
Chronos is public/Apache-2.0 — **no token needed to download or fine-tune it**
(AutoGluon pulls `amazon/chronos-bolt-small` automatically — see
`pipeline/train/config.yaml`). A token (`HF_TOKEN`,
Write scope) is only needed to **push your fine-tuned model** to a HF repo and to
**deploy this service to a HuggingFace Space**.

### Serving straight from HuggingFace (zero local data)

The deployed model and its context data are published publicly:

- model — [`afyalink/afyasolar-chronos-48m-climate-ea-v1`](https://huggingface.co/afyalink/afyasolar-chronos-48m-climate-ea-v1)
- dataset — [`afyalink/afyasolar-nasa-power-east-africa`](https://huggingface.co/datasets/afyalink/afyasolar-nasa-power-east-africa)

Set both repos in `.env` and the service needs no local model folder, no
processed parquets, and no locations file:

```
AI_ENGINE_MODEL_REPO=afyalink/afyasolar-chronos-48m-climate-ea-v1
AI_ENGINE_DATA_REPO=afyalink/afyasolar-nasa-power-east-africa
```

Snapshots are cached in the standard HF cache and reused across restarts; only
`processed/*` and `grid_locations.json` are fetched from the dataset repo (the
raw CSV is skipped). No token is needed to serve — both repos are public;
Write access matters only for publishing (`pipeline/data/hf_upload.py` or the
notebook's push step). In repo mode `GET /health`'s `models_available` means
"configured to serve from the repo" (verified against the cached snapshot once
one exists) — the probe never downloads; the first forecast call does. On CI or
offline boxes set `HF_HUB_OFFLINE=1` for deterministic 503s instead of network
attempts. A retrained model pushed to the repo is picked up on the next process
restart (each start resolves the latest revision).

### Licensing of the models
This repository's **code** is MIT (see the root `LICENSE`). The **fine-tuned
climate weights are a derivative of `amazon/chronos-bolt-small` (~48M), which is
Apache-2.0**, so those weights must be redistributed under Apache-2.0 with
Amazon's copyright notice and a note that they were modified (Apache-2.0 §4).
Publish them that way on HuggingFace. The predictive-maintenance models (RUL,
anomaly) are trained from scratch on our own synthetic telemetry and carry no
upstream obligation — release them MIT alongside the code.

## Deploy

Build the container (or push to a HF Space — it uses the `Dockerfile` and port
7860):

```bash
docker build -t afyasolar-ai-engine .
docker run -p 7860:7860 afyasolar-ai-engine
```

## Variables (7)

`ALLSKY_SFC_SW_DWN` (irradiance→yield), `T2M` / `T2M_MAX` / `T2M_MIN` (heat),
`PRECTOTCORR` (flood/drought), `WS10M` (storm), `RH2M` (context) — the superset
of what the app already uses.
