"""
Upload the trained climate model + the NASA POWER dataset to the HuggingFace Hub,
ONE FILE AT A TIME (sequential, low-concurrency) so a flaky connection can't be
overwhelmed by parallel large-file transfers. Resumable: files already present in
the repo (checked via list_repo_files) are skipped, so a re-run continues where it
left off. Repos are uploaded one after another (model, then dataset).

Requires a cached HF login with Write scope.

    python pipeline/data/hf_upload.py                 # both, sequential
    python pipeline/data/hf_upload.py --only model
"""
from __future__ import annotations

import argparse
import fnmatch
from pathlib import Path

from huggingface_hub import list_repo_files, upload_file

AI_SERVICE = Path(__file__).resolve().parents[2]
MODEL_REPO = "afyalink/afyasolar-chronos-48m-climate-ea-v1"
DATASET_REPO = "afyalink/afyasolar-nasa-power-east-africa"


def _match(rel: str, patterns: list[str] | None) -> bool:
    return patterns is None or any(fnmatch.fnmatch(rel, p) for p in patterns)


def push(folder: Path, repo_id: str, repo_type: str,
         allow: list[str] | None = None, ignore: list[str] | None = None) -> None:
    files = [p for p in folder.rglob("*") if p.is_file()]
    picked = []
    for p in files:
        rel = p.relative_to(folder).as_posix()
        if ignore and any(fnmatch.fnmatch(rel, ig) for ig in ignore):
            continue
        if _match(rel, allow):
            picked.append((p, rel))
    picked.sort(key=lambda t: t[0].stat().st_size)  # small first (quick wins), big last

    try:
        already = set(list_repo_files(repo_id, repo_type=repo_type))
    except Exception:
        already = set()

    print(f">>> [{repo_type}] {repo_id}: {len(picked)} files "
          f"({len(already)} already present)", flush=True)
    for i, (p, rel) in enumerate(picked, 1):
        mb = p.stat().st_size / 1e6
        if rel in already:
            print(f"    [{i}/{len(picked)}] skip (uploaded): {rel} ({mb:.1f} MB)", flush=True)
            continue
        print(f"    [{i}/{len(picked)}] uploading {rel} ({mb:.1f} MB) ...", flush=True)
        upload_file(path_or_fileobj=str(p), path_in_repo=rel,
                    repo_id=repo_id, repo_type=repo_type,
                    commit_message=f"upload {rel}")
        print(f"    [{i}/{len(picked)}] done: {rel}", flush=True)
    print(f">>> {repo_type} REPO DONE: {repo_id}", flush=True)


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--only", choices=["model", "dataset"], default=None)
    args = ap.parse_args()

    if args.only != "dataset":
        push(AI_SERVICE / "afyasolar-chronos-48m-climate-ea-v1", MODEL_REPO, "model",
             ignore=["*.log", "logs/*"])
    if args.only != "model":
        push(AI_SERVICE / "dataset", DATASET_REPO, "dataset",
             allow=["README.md", "*.csv", "processed/*.parquet", "grid_locations.json"])
    print("ALL UPLOADS DONE", flush=True)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
