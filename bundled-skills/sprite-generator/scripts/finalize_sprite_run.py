
#!/usr/bin/env python3
from __future__ import annotations
import argparse
from pathlib import Path
from sprite_pipeline import compose_atlas, ensure_dir, extract_job_frames, load_json, make_contact_sheet, save_json, validate_rows, write_godot_files, write_preview_gifs


def main() -> None:
    ap = argparse.ArgumentParser(description="Finalize a sprite generation run into frames, atlas, QA, and Godot files.")
    ap.add_argument("--run-dir", required=True)
    ap.add_argument("--allow-incomplete", action="store_true", help="Finalize only completed non-base jobs.")
    args = ap.parse_args()
    run_dir = Path(args.run_dir)
    request = load_json(run_dir / "asset_request.json")
    manifest = load_json(run_dir / "imagegen-jobs.json")
    jobs = [j for j in manifest.get("jobs", []) if j.get("id") != "base"]
    incomplete = [j["id"] for j in jobs if j.get("status") != "complete"]
    if incomplete and not args.allow_incomplete:
        raise SystemExit("Incomplete jobs: " + ", ".join(incomplete) + ". Use --allow-incomplete to package completed rows only.")
    rows = []
    frames_root = ensure_dir(run_dir / "frames")
    for job in jobs:
        if job.get("status") != "complete":
            continue
        source_path = Path(job.get("recorded_path") or job.get("decoded_path"))
        if not source_path.exists():
            raise SystemExit(f"Missing decoded image for {job['id']}: {source_path}")
        out_dir = frames_root / job["id"]
        frame_paths = extract_job_frames(job, source_path, out_dir, request)
        rows.append((job["id"], frame_paths))
    final_dir = ensure_dir(run_dir / "final")
    atlas_manifest = compose_atlas(rows, final_dir / "spritesheet.png", request)
    qa_dir = ensure_dir(run_dir / "qa")
    make_contact_sheet(rows, qa_dir / "contact-sheet.png", request)
    review = validate_rows(rows, request, atlas_manifest)
    preview_paths = write_preview_gifs(rows, qa_dir / "previews", request)
    godot_files = write_godot_files(run_dir, request, atlas_manifest, rows)
    frames_manifest = {
        "rows": [{"id": rid, "frames": [str(p) for p in paths]} for rid, paths in rows],
        "atlas": atlas_manifest,
        "godot_files": godot_files,
        "preview_files": preview_paths,
    }
    save_json(frames_root / "frames-manifest.json", frames_manifest)
    save_json(final_dir / "validation.json", review)
    save_json(qa_dir / "run-summary.json", {"request": request, "atlas": atlas_manifest, "review": review, "godot_files": godot_files})
    print(f"Final spritesheet: {atlas_manifest['path']}")
    if atlas_manifest.get("webp_path"):
        print(f"WebP spritesheet: {atlas_manifest['webp_path']}")
    print(f"Contact sheet: {qa_dir / 'contact-sheet.png'}")
    print(f"Godot files: {run_dir / 'godot'}")
    if review["errors"]:
        print("ERRORS:")
        for e in review["errors"]:
            print(f"- {e}")
        raise SystemExit(1)
    if review["warnings"]:
        print("Warnings requiring visual review:")
        for w in review["warnings"]:
            print(f"- {w}")
    print("Finalize complete.")


if __name__ == "__main__":
    main()
