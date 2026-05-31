
#!/usr/bin/env python3
from __future__ import annotations
import argparse
import shutil
from pathlib import Path
from sprite_pipeline import ensure_dir, load_json


def main() -> None:
    ap = argparse.ArgumentParser(description="Copy finalized sprite assets into a Godot project folder.")
    ap.add_argument("--run-dir", required=True)
    ap.add_argument("--project-dir", required=True, help="Filesystem path to the Godot project root.")
    ap.add_argument("--dest", default="assets/sprites", help="Project-relative destination folder, default assets/sprites/<slug>.")
    ap.add_argument("--slug", default="", help="Override destination slug folder.")
    args = ap.parse_args()
    run_dir = Path(args.run_dir)
    request = load_json(run_dir / "asset_request.json")
    slug = args.slug or request.get("slug") or "sprite-asset"
    dest = ensure_dir(Path(args.project_dir).expanduser().resolve() / args.dest / slug)
    files = [
        run_dir / "final" / "spritesheet.png",
        run_dir / "final" / "spritesheet.webp",
        run_dir / "godot" / f"{slug}_spriteframes.tres",
        run_dir / "godot" / f"{slug}_animated_sprite_2d.tscn",
        run_dir / "godot" / "godot_import_manifest.json",
        run_dir / "godot" / "README_GODOT.md",
    ]
    copied = []
    for f in files:
        if f.exists():
            dst = dest / f.name
            shutil.copy2(f, dst)
            copied.append(dst)
    print(f"Copied {len(copied)} files to {dest}")
    for p in copied:
        print(f"- {p}")
    print("Open the .tres if your res:// path differs from the generated texture_path hint.")


if __name__ == "__main__":
    main()
