---
license: cc-by-4.0
pretty_name: AfyaSolar — NASA POWER East Africa (daily, 2000–present)
tags:
- climate
- weather
- solar
- nasa-power
- east-africa
- tanzania
- time-series
---

# AfyaSolar — NASA POWER East Africa (daily, 2000→present)

Daily climate series for a **275-point 1° land grid over East Africa**, fetched from
[NASA POWER](https://power.larc.nasa.gov/). This is the training corpus for the
[AfyaSolar climate forecaster](https://huggingface.co/afyalink/afyasolar-chronos-48m-climate-ea-v1).

| | |
|---|---|
| **Source** | NASA POWER (community `RE`), point/regional API |
| **Grid** | 275 land points, 1° over East Africa (lat −17…5, lon 29…41; ocean cells dropped) |
| **Variables (7)** | `ALLSKY_SFC_SW_DWN`, `T2M`, `T2M_MAX`, `T2M_MIN`, `PRECTOTCORR`, `WS10M`, `RH2M` |
| **Period** | 2000-01-01 → present (~27 years) |
| **Rows** | ~18.7M (raw long format) |
| **Missing** | ~0.08% |

## Files
| path | description |
|---|---|
| `nasa_east_africa_daily_2000_present.csv` | raw long/tidy: `location_id, date, variable, value` |
| `processed/daily.parquet` | Chronos-ready daily series: `item_id, timestamp, target, split` |
| `processed/monthly.parquet` | Chronos-ready monthly series (precip summed; others averaged) |
| `grid_locations.json` | the 275 grid points (`id, lat, lon`) |

`item_id` = `"<location>|<variable>|<freq>"`, e.g. `ea_m6_39|T2M|D`.

## Regenerate
```bash
python pipeline/data/make_grid.py         # build the 275-point grid
python pipeline/data/fetch_regional.py    # fetch NASA POWER -> CSV
python pipeline/datasets/build_dataset.py --raw <csv> --out-dir dataset/processed
```

## License / attribution
NASA POWER data is freely available for public use (please cite NASA POWER).
This packaging is released under **CC-BY-4.0**.
