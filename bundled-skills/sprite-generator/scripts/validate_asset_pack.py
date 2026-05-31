
#!/usr/bin/env python3
from __future__ import annotations
import argparse
from pathlib import Path
from sprite_pipeline import load_json, save_json, validate_rows


def main() -> None:
    ap = argparse.ArgumentParser(description="Validate extracted frames and atlas geometry.")
    ap.add_argument("--run-dir", required=True)
    args = ap.parse_args()
    run_dir = Path(args.run_dir)
    request = load_json(run_dir / "asset_request.json")
    frames_manifest = load_json(run_dir / "frames" / "frames-manifest.json")
    rows = [(r["id"], [Path(p) for p in r["frames"]]) for r in frames_manifest.get("rows", [])]
    review = validate_rows(rows, request, frames_manifest.get("atlas"))
    out = run_dir / "final" / "validation.json"
    save_json(out, review)
    print(out)
    if review["errors"]:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
