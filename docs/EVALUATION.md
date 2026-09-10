# Model evaluation

Published so the forecasting claims can be checked without retraining. Source of
record is the model card at
[`afyalink/afyasolar-chronos-48m-climate-ea-v1`](https://huggingface.co/afyalink/afyasolar-chronos-48m-climate-ea-v1);
the numbers below are transcribed from it.

## Climate forecasting

**Method.** AutoGluon three-window rolling backtest over the East Africa daily
series described in
[`afyalink/afyasolar-nasa-power-east-africa`](https://huggingface.co/datasets/afyalink/afyasolar-nasa-power-east-africa).
Metric is Weighted Quantile Loss. Lower is better.

| Horizon | SeasonalNaive | Chronos zero-shot | Chronos fine-tuned |
|---|---|---|---|
| Monthly | 0.253 | **0.162** | 0.163 |
| Daily | 0.110 | **0.053** | 0.053 |

**Result.** Chronos reduces forecast error against the seasonal-naive baseline by
roughly 36% at the monthly horizon and 52% at the daily horizon. That is the
headline figure for the forecasting capability.

**On fine-tuning.** The domain fine-tune matched zero-shot performance rather
than exceeding it, so the zero-shot predictor is the one deployed. We publish the
fine-tuned weights and the training pipeline regardless, because reproducibility
is part of the open release and because the result is useful to anyone else
adapting Chronos to a regional climate dataset. No fine-tuning benefit is claimed
on this evidence.

## Predictive maintenance

Held-out metrics are not yet published for remaining-useful-life and anomaly
detection, because validation requires real failure data and the pilot fleet has
not yet produced it. Both models are trained on physics-based synthetic telemetry
from `ai-service/pipeline/synthetic/generate_telemetry.py`, which models battery
state-of-health fade with injected faults, and the serving path scores a
representative window when none is supplied.

The method and its interfaces are complete; this section gains held-out metrics
against observed failures once field telemetry is connected.

## Reproducing these numbers

```
cd ai-service
pip install -r requirements-serve.txt
python pipeline/eval/backtest.py
```

The script writes `backtest_report.md`, `leaderboard.csv` and
`per_variable_metrics.csv` into the predictor output directory. Those outputs are
gitignored because they are large and regenerable, which is why this summary
exists in the repository.

**Caveats on exact reproduction.** The training dataset is defined as "2000 to
present", so it grows over time and a rerun will not reproduce these figures
exactly. No random seed or hardware profile is currently pinned. Pinning a
dataset snapshot and a seed is open work.
