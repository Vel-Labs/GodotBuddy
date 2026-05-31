
#!/usr/bin/env python3
from __future__ import annotations
import argparse
from pathlib import Path
from sprite_pipeline import extract_job_frames, load_json


def main() -> None:
    ap = argparse.ArgumentParser(description="Extract frames for one completed job.")
    ap.add_argument("--run-dir", required=True)
    ap.add_argument("--job-id", required=True)
    args = ap.parse_args()
    run_dir = Path(args.run_dir)
    request = load_json(run_dir / "asset_request.json")
    manifest = load_json(run_dir / "imagegen-jobs.json")
    job = next((j for j in manifest.get("jobs", []) if j.get("id") == args.job_id), None)
    if not job:
        raise SystemExit(f"Unknown job: {args.job_id}")
    source_path = Path(job.get("recorded_path") or job.get("decoded_path"))
    paths = extract_job_frames(job, source_path, run_dir / "frames" / job["id"], request)
    for p in paths:
        print(p)


if __name__ == "__main__":
    main()
