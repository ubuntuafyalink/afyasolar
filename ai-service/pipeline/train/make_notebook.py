"""
Generate a ready-to-upload Google Colab notebook for the Chronos-Bolt fine-tune.

Writes ``AfyaSolar_Chronos_Finetune.ipynb`` next to this script. Building the JSON
programmatically guarantees it is a valid .ipynb.

    python pipeline/train/make_notebook.py
"""
from __future__ import annotations

import json
from pathlib import Path

HERE = Path(__file__).resolve().parent
OUT = HERE / "AfyaSolar_Chronos_Finetune.ipynb"

cells: list[dict] = []


def md(text: str) -> None:
    cells.append({"cell_type": "markdown", "metadata": {},
                  "source": text.strip("\n").splitlines(keepends=True)})


def code(text: str) -> None:
    cells.append({"cell_type": "code", "metadata": {}, "execution_count": None,
                  "outputs": [], "source": text.strip("\n").splitlines(keepends=True)})


# ── Title ────────────────────────────────────────────────────────────────────
md("""
# AfyaSolar · Chronos-Bolt Fine-Tuning (East Africa, 2000–present)

Fine-tune **Chronos-Bolt** on **1,925** NASA POWER climate series (275 East-African
land points × 7 variables, daily 2000→present).

Each horizon trains three models so the fine-tune's value is provable on one leaderboard:

| model | what it is |
|---|---|
| `SeasonalNaive` | naive seasonal baseline |
| `ChronosZeroShot` | pretrained Chronos-Bolt, no fine-tuning |
| `ChronosFineTuned` | Chronos-Bolt LoRA-fine-tuned on our data |

Metric = **WQL** (weighted quantile loss); AutoGluon reports `score_val` as *negative*
WQL, so **higher is better**. Success = `ChronosFineTuned` on top.

> **Before you start:** `Runtime ▸ Change runtime type ▸ T4 GPU`.
> You will upload `daily.parquet` and `monthly.parquet` (from `dataset/processed/`) in Step 3.
""")

# ── Step 1 ───────────────────────────────────────────────────────────────────
md("## Step 1 · Confirm the GPU\nFine-tuning needs a GPU. This checks one is attached.")
code("""
!nvidia-smi --query-gpu=name,memory.total --format=csv,noheader || print("NO GPU — Runtime ▸ Change runtime type ▸ T4 GPU, then re-run")
""")

# ── Step 2 ───────────────────────────────────────────────────────────────────
md("## Step 2 · Install AutoGluon-TimeSeries\nPulls torch + Chronos. **If Colab asks to restart the runtime, do it, then continue from Step 3** (skip Step 2).")
code("""
# Pinned to match the AI service's serving env (AutoGluon predictors are NOT
# backward/forward compatible across versions — the saved model must load with
# the exact same version it was trained on).
!pip -q install "autogluon.timeseries==1.6.1"
import autogluon.timeseries as ag; print("autogluon.timeseries", ag.__version__)
print("✅ installed — restart runtime if prompted, then continue at Step 3")
""")

# ── Step 3 ───────────────────────────────────────────────────────────────────
md("## Step 3 · Upload the processed series\nUpload **both** files from `dataset/processed/`: `daily.parquet` and `monthly.parquet` (~76 MB total).")
code("""
from google.colab import files
import os
up = files.upload()   # select daily.parquet AND monthly.parquet
for f in ["monthly.parquet", "daily.parquet"]:
    print(f, "✓" if os.path.exists(f) else "❌ MISSING — upload it")
""")

# ── Step 4 ───────────────────────────────────────────────────────────────────
md("## Step 4 · Fine-tune configuration\n`bolt_small`, LoRA fine-tune (2000 steps, lr 1e-4). Three models per horizon; ensembling off so they stay directly comparable.")
code("""
MODEL, STEPS, LR = "bolt_small", 2000, 1e-4
# Official Chronos-Bolt parameter counts -> baked into the model name.
CHRONOS_PARAMS = {"bolt_tiny": "9m", "bolt_mini": "21m", "bolt_small": "48m", "bolt_base": "205m"}
PARAM_TAG = CHRONOS_PARAMS.get(MODEL, "na")
MODEL_NAME = f"afyasolar-chronos-{PARAM_TAG}-climate-ea-v1"   # e.g. afyasolar-chronos-48m-climate-ea-v1
HORIZONS = {
    "monthly": {"file": "monthly.parquet", "freq": "MS", "prediction_length": 12, "time_limit": 1800},
    "daily":   {"file": "daily.parquet",   "freq": "D",  "prediction_length": 30, "time_limit": 3600},
}
HYPERPARAMETERS = {
    "SeasonalNaive": {},
    "Chronos": [
        {"model_path": MODEL, "ag_args": {"name_suffix": "ZeroShot"}},
        {"model_path": MODEL, "fine_tune": True, "fine_tune_steps": STEPS,
         "fine_tune_lr": LR, "ag_args": {"name_suffix": "FineTuned"}},
    ],
}
print("config ready:", MODEL, f"(~{PARAM_TAG.upper()} params),", STEPS, "steps")
print("model name:", MODEL_NAME)
""")

# ── Step 5 ───────────────────────────────────────────────────────────────────
md("## Step 5 · Fine-tune the MONTHLY model (H = 12)\nThe model the app serves today — quick, high-value win (~10–20 min). A **⏳ heartbeat prints elapsed + estimated remaining every 30s** so you can see progress; the leaderboard prints when done.")
code("""
import pandas as pd, threading, time
from autogluon.timeseries import TimeSeriesDataFrame, TimeSeriesPredictor

def run_horizon(name):
    cfg = HORIZONS[name]
    df = pd.read_parquet(cfg["file"])[["item_id", "timestamp", "target"]]
    tsdf = TimeSeriesDataFrame.from_data_frame(df, id_column="item_id", timestamp_column="timestamp")
    print(f"[{name}] {tsdf.num_items} series, {len(tsdf):,} obs")
    predictor = TimeSeriesPredictor(
        prediction_length=cfg["prediction_length"], freq=cfg["freq"],
        eval_metric="WQL", target="target", path=f"outputs/{name}")

    # Live progress: a heartbeat thread prints elapsed + estimated remaining every
    # 30s against the training budget (time_limit), so you always see an ETA.
    budget = cfg["time_limit"]; stop = {"done": False}; t0 = time.time()
    def heartbeat():
        while not stop["done"]:
            time.sleep(30)
            if stop["done"]:
                break
            el = time.time() - t0
            rem = max(0.0, budget - el)
            bar = int(24 * min(el / budget, 1.0))
            print(f"  ⏳ [{name}] {el/60:5.1f} min elapsed · ~{rem/60:4.1f} min left "
                  f"[{'█'*bar}{'░'*(24-bar)}] (budget {budget//60} min)", flush=True)
    th = threading.Thread(target=heartbeat, daemon=True); th.start()
    try:
        predictor.fit(tsdf, hyperparameters=HYPERPARAMETERS, num_val_windows=3,
                      time_limit=budget, enable_ensemble=False)
    finally:
        stop["done"] = True
        th.join(timeout=2)

    print(f"  ✅ [{name}] finished in {(time.time()-t0)/60:.1f} min")
    lb = predictor.leaderboard()
    lb.to_csv(f"outputs/{name}/leaderboard.csv", index=False)
    print(lb.to_string(index=False))
    return lb

lb_monthly = run_horizon("monthly")
""")

# ── Step 6 ───────────────────────────────────────────────────────────────────
md("## Step 6 · Fine-tune the DAILY model (H = 30) — the long one\n1,925 series of ~9,706 points; heaviest step (capped at 1 h by `time_limit`). Keep the tab active; if the T4 disconnects, re-run Steps 3–4 then this cell.")
code("""
lb_daily = run_horizon("daily")
""")

# ── Step 7 ───────────────────────────────────────────────────────────────────
md("""
## Step 7 · Training diagnostics — is it learning or overfitting?

Two views:
1. **Validation WQL bars** (per horizon) — SeasonalNaive vs Chronos ZeroShot vs FineTuned, from
   AutoGluon's rolling backtest on held-out windows. **FineTuned *below* ZeroShot ⇒ it learned useful
   patterns; FineTuned *at/above* ZeroShot ⇒ overfitting or no gain.** A verdict is printed on each chart.
2. **Fine-tune training-loss curve** — shown *if* this AutoGluon build logs one (`trainer_state.json`):
   a steadily falling curve = learning; flat/rising = stalled.
""")
code("""
import matplotlib.pyplot as plt, json, glob

pairs = [("monthly", lb_monthly)]
if "lb_daily" in globals():
    pairs.append(("daily", lb_daily))

def scores(lb):
    out = {}
    for _, r in lb.iterrows():
        m = r["model"]
        k = ("FineTuned" if "FineTuned" in m else "ZeroShot" if "ZeroShot" in m
             else "SeasonalNaive" if "SeasonalNaive" in m else m)
        out[k] = -float(r["score_val"])          # WQL (lower = better)
    return out

# (1) Validation WQL bars + verdict
fig, axes = plt.subplots(1, len(pairs), figsize=(6*len(pairs), 4), squeeze=False)
for ax, (name, lb) in zip(axes[0], pairs):
    s = scores(lb); order = ["SeasonalNaive", "ZeroShot", "FineTuned"]
    vals = [s.get(k) for k in order]
    ax.bar(order, [v or 0 for v in vals], color=["#9ca3af", "#f59e0b", "#16a34a"])
    ax.set_title(f"{name} — validation WQL (lower is better)"); ax.set_ylabel("WQL")
    for i, v in enumerate(vals):
        if v is not None: ax.text(i, v, f"{v:.4f}", ha="center", va="bottom", fontsize=9)
    if s.get("FineTuned") is not None and s.get("ZeroShot") is not None:
        better = s["FineTuned"] < s["ZeroShot"]
        pct = (s["ZeroShot"] - s["FineTuned"]) / s["ZeroShot"] * 100
        ax.text(0.5, 0.92,
                (f"✅ learned ({pct:+.1f}% vs zero-shot)" if better
                 else f"⚠️ overfit / no gain ({pct:+.1f}%)"),
                transform=ax.transAxes, ha="center", va="top", fontsize=11, fontweight="bold",
                color=("#16a34a" if better else "#dc2626"))
plt.tight_layout(); plt.show()

# (2) Best-effort fine-tune training-loss curve
def loss_curves():
    found = False
    for name, _ in pairs:
        for sp in glob.glob(f"outputs/{name}/**/trainer_state.json", recursive=True):
            try:
                hist = json.load(open(sp)).get("log_history", [])
                pts = [(h["step"], h["loss"]) for h in hist if "loss" in h and "step" in h]
                if len(pts) > 1:
                    xs, ys = zip(*pts)
                    plt.figure(figsize=(7, 4)); plt.plot(xs, ys, marker=".")
                    plt.title(f"{name} · Chronos fine-tune training loss")
                    plt.xlabel("step"); plt.ylabel("training loss"); plt.grid(alpha=.3)
                    plt.show(); found = True
            except Exception:
                pass
    if not found:
        print("ℹ️ No per-step loss log exposed by this AutoGluon build — use the bars above:")
        print("   FineTuned below ZeroShot = learned; at/above = overfitting or no gain.")
loss_curves()
""")

# ── Step 8 ───────────────────────────────────────────────────────────────────
md("""
## Step 8 · Package under the AfyaSolar name
Copies the two fine-tuned predictors into `models/afyasolar-chronos-48m-climate-ea-v1/{daily,monthly}`
and writes a **model card** (`model_card.json`) so anyone can tell what this model is, how it was
trained, and how it scored. The `daily/`/`monthly/` subfolders are kept so the AI service can load
`MODEL_DIR/<horizon>` unchanged.
""")
code("""
import os, json, shutil, datetime
model_dir = f"models/{MODEL_NAME}"
shutil.rmtree(model_dir, ignore_errors=True)
for h in ["monthly", "daily"]:
    if os.path.isdir(f"outputs/{h}"):
        shutil.copytree(f"outputs/{h}", f"{model_dir}/{h}")

def best(lb):
    r = lb.sort_values("score_val", ascending=False).iloc[0]
    return {"winner": r["model"], "wql": round(float(-r["score_val"]), 4)}

card = {
    "name": MODEL_NAME,
    "base_model": f"amazon/chronos-{MODEL}",
    "parameters": f"~{PARAM_TAG.upper()}",
    "task": "Daily & monthly forecasting of 7 raw NASA POWER climate variables "
            "(the app derives hazard indices + solar yield from these).",
    "variables": ["ALLSKY_SFC_SW_DWN", "T2M", "T2M_MAX", "T2M_MIN", "PRECTOTCORR", "WS10M", "RH2M"],
    "region": "East Africa — 275-point 1-degree land grid",
    "training_period": "2000-01-01 .. present (NASA POWER daily)",
    "horizons": {"daily": {"prediction_length": 30, "freq": "D"},
                 "monthly": {"prediction_length": 12, "freq": "MS"}},
    "fine_tune": {"steps": STEPS, "lr": LR},
    "metric": "WQL (weighted quantile loss, lower is better)",
    "results": {"monthly": best(lb_monthly), "daily": best(lb_daily)},
    "base_license": "Apache-2.0 (Chronos-Bolt)",
    "created": datetime.date.today().isoformat(),
}
json.dump(card, open(f"{model_dir}/model_card.json", "w"), indent=2)
print(json.dumps(card, indent=2))
""")

# ── Step 9 ───────────────────────────────────────────────────────────────────
md("## Step 9 · Download the model\nZips the branded folder and downloads **`afyasolar-chronos-48m-climate-ea-v1.zip`**. Send that + the leaderboards back to deploy it into the AI service.")
code("""
from google.colab import files
shutil.make_archive(MODEL_NAME, "zip", "models", MODEL_NAME)
print(f"{MODEL_NAME}.zip ready")
files.download(f"{MODEL_NAME}.zip")
""")

# ── Assemble notebook ────────────────────────────────────────────────────────
nb = {
    "cells": cells,
    "metadata": {
        "accelerator": "GPU",
        "colab": {"provenance": [], "toc_visible": True},
        "kernelspec": {"display_name": "Python 3", "name": "python3"},
        "language_info": {"name": "python"},
    },
    "nbformat": 4,
    "nbformat_minor": 5,
}

OUT.write_text(json.dumps(nb, indent=1, ensure_ascii=False), encoding="utf-8")
print(f"Wrote {OUT}  ({len(cells)} cells)")
