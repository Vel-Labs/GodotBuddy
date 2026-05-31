
#!/usr/bin/env python3
from __future__ import annotations
import argparse
from pathlib import Path
from sprite_pipeline import compose_atlas, load_json, save_json


def main() -> None:
    ap = argparse.ArgumentParser(description="Compose atlas from extracted frames.")
    ap.add_argument("--run-dir", required=True)
    args = ap.parse_args()
    run_dir = Path(args.run_dir)
    request = load_json(run_dir / "asset_request.json")
    frames_manifest = load_json(run_dir / "frames" / "frames-manifest.json") if (run_dir / "frames" / "frames-manifest.json").exists() else {"rows": []}
    rows = [(r["id"], [Path(p) for p in r["frames"]]) for r in frames_manifest.get("rows", [])]
    atlas = compose_atlas(rows, run_dir / "final" / "spritesheet.png", request)
    frames_manifest["atlas"] = atlas
    save_json(run_dir / "frames" / "frames-manifest.json", frames_manifest)
    print(atlas["path"])


if __name__ == "__main__":
    main()
