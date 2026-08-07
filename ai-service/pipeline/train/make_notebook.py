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
!pip -q install "autogluon.timeseries>=1.2"
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
print("config ready:", MODEL, STEPS, "steps")
""")

# ── Step 5 ───────────────────────────────────────────────────────────────────
md("## Step 5 · Fine-tune the MONTHLY model (H = 12)\nThe model the app serves today — quick, high-value win (~10–20 min). Prints the leaderboard when done.")
code("""
import pandas as pd
from autogluon.timeseries import TimeSeriesDataFrame, TimeSeriesPredictor

def run_horizon(name):
    cfg = HORIZONS[name]
    df = pd.read_parquet(cfg["file"])[["item_id", "timestamp", "target"]]
    tsdf = TimeSeriesDataFrame.from_data_frame(df, id_column="item_id", timestamp_column="timestamp")
    print(f"[{name}] {tsdf.num_items} series, {len(tsdf):,} obs")
    predictor = TimeSeriesPredictor(
        prediction_length=cfg["prediction_length"], freq=cfg["freq"],
        eval_metric="WQL", target="target", path=f"outputs/{name}")
    predictor.fit(tsdf, hyperparameters=HYPERPARAMETERS, num_val_windows=3,
                  time_limit=cfg["time_limit"], enable_ensemble=False)
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
md("## Step 7 · Did fine-tuning help?\n`score_val` is **negative WQL (higher = better)**. Success = `ChronosFineTuned` ranks above `ChronosZeroShot` and `SeasonalNaive`.")
code("""
for nm, lb in [("MONTHLY", lb_monthly), ("DAILY", lb_daily)]:
    print(f"\\n=== {nm} ===")
    print(lb[["model", "score_val"]].sort_values("score_val", ascending=False).to_string(index=False))
""")

# ── Step 8 ───────────────────────────────────────────────────────────────────
md("## Step 8 · Download the fine-tuned predictors\nZips `outputs/monthly` + `outputs/daily`. Send the leaderboards + this zip back and the models get deployed into the AI service.")
code("""
import shutil
from google.colab import files
shutil.make_archive("chronos_finetuned", "zip", "outputs")
files.download("chronos_finetuned.zip")
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
