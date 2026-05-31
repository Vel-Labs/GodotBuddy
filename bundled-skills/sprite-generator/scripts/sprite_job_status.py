
#!/usr/bin/env python3
from __future__ import annotations
import argparse
from pathlib import Path
from sprite_pipeline import load_json


def main() -> None:
    ap = argparse.ArgumentParser(description="Show sprite image-generation job status.")
    ap.add_argument("--run-dir", required=True)
    args = ap.parse_args()
    run_dir = Path(args.run_dir)
    manifest = load_json(run_dir / "imagegen-jobs.json")
    jobs = manifest.get("jobs", [])
    status_by_id = {j["id"]: j.get("status", "pending") for j in jobs}
    print(f"Run: {run_dir}")
    for job in jobs:
        reqs = job.get("requires", [])
        ready = all(status_by_id.get(r) == "complete" for r in reqs) and job.get("status") != "complete"
        marker = "READY" if ready else job.get("status", "pending").upper()
        print(f"[{marker:8}] {job['id']}  kind={job.get('kind')} frames={job.get('frame_count')} prompt={job.get('prompt_path')}")
        if ready:
            if job.get("input_images"):
                print("           input images:")
                for img in job.get("input_images", []):
                    print(f"           - {img.get('path')} — {img.get('role')}")
            print(f"           record with: python scripts/record_imagegen_result.py --run-dir {run_dir} --job-id {job['id']} --source /path/to/generated.png")


if __name__ == "__main__":
    main()
