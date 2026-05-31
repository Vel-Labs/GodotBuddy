
#!/usr/bin/env python3
from __future__ import annotations
import argparse
from pathlib import Path
from sprite_pipeline import load_json, write_preview_gifs


def main() -> None:
    ap = argparse.ArgumentParser(description="Render GIF previews from extracted frames.")
    ap.add_argument("--run-dir", required=True)
    args = ap.parse_args()
    run_dir = Path(args.run_dir)
    request = load_json(run_dir / "asset_request.json")
    frames_manifest = load_json(run_dir / "frames" / "frames-manifest.json")
    rows = [(r["id"], [Path(p) for p in r["frames"]]) for r in frames_manifest.get("rows", [])]
    paths = write_preview_gifs(rows, run_dir / "qa" / "previews", request)
    for p in paths:
        print(p)


if __name__ == "__main__":
    main()
