
#!/usr/bin/env python3
from __future__ import annotations
import argparse
import shutil
from pathlib import Path
from sprite_pipeline import ensure_dir, load_json, save_json


def main() -> None:
    ap = argparse.ArgumentParser(description="Record a selected generated image for a sprite job.")
    ap.add_argument("--run-dir", required=True)
    ap.add_argument("--job-id", required=True)
    ap.add_argument("--source", required=True, help="Path to selected original generated output image.")
    args = ap.parse_args()
    run_dir = Path(args.run_dir)
    source = Path(args.source).expanduser().resolve()
    if not source.exists():
        raise SystemExit(f"Source image not found: {source}")
    manifest_path = run_dir / "imagegen-jobs.json"
    manifest = load_json(manifest_path)
    jobs = manifest.get("jobs", [])
    job = next((j for j in jobs if j.get("id") == args.job_id), None)
    if not job:
        raise SystemExit(f"Unknown job id: {args.job_id}")
    dst = Path(job.get("decoded_path") or (run_dir / "decoded" / f"{args.job_id}.png"))
    ensure_dir(dst.parent)
    shutil.copy2(source, dst)
    job["status"] = "complete"
    job["source_path"] = str(source)
    job["recorded_path"] = str(dst)
    if args.job_id == "base":
        canonical = run_dir / "references" / "canonical-base.png"
        shutil.copy2(dst, canonical)
        job["canonical_base_path"] = str(canonical)
        for other in jobs:
            if other.get("id") != "base" and other.get("status") != "complete":
                imgs = other.setdefault("input_images", [])
                if not any(i.get("path") == str(canonical) for i in imgs):
                    imgs.insert(0, {"path": str(canonical), "role": "canonical base identity reference"})
    save_json(manifest_path, manifest)
    print(f"Recorded {args.job_id}: {dst}")


if __name__ == "__main__":
    main()
