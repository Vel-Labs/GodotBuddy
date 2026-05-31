
#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import os
from pathlib import Path
from typing import Any, Dict, List

from sprite_pipeline import ensure_dir, load_json, make_layout_guide, parse_color, parse_size, save_json, slugify


def parse_output_spec(spec: str, kind_default: str = "animation") -> Dict[str, Any]:
    """Parse id:frames:description[:layout][:loop|once]."""
    parts = spec.split(":")
    if len(parts) < 2:
        raise argparse.ArgumentTypeError("Expected id:frames:description[:layout][:loop|once]")
    oid = parts[0].strip()
    try:
        frames = int(parts[1])
    except ValueError as exc:
        raise argparse.ArgumentTypeError("frames must be an integer") from exc
    desc = parts[2].strip() if len(parts) >= 3 and parts[2].strip() else oid.replace("_", " ")
    layout = parts[3].strip() if len(parts) >= 4 and parts[3].strip() else ("single" if frames == 1 else "strip-h")
    loop = True
    if len(parts) >= 5:
        loop = parts[4].strip().lower() not in {"once", "false", "no", "0"}
    return {"id": oid, "kind": kind_default, "frame_count": frames, "description": desc, "layout": layout, "loop": loop}


def default_outputs(asset_type: str) -> List[Dict[str, Any]]:
    if asset_type in {"character", "npc", "player"}:
        return [
            {"id": "idle", "kind": "animation", "frame_count": 4, "description": "gentle breathing and blink loop", "layout": "strip-h", "loop": True, "fps": 5, "anchor": "bottom"},
            {"id": "walk_down", "kind": "animation", "frame_count": 6, "description": "walking toward camera/front/down direction", "layout": "strip-h", "loop": True, "fps": 8, "anchor": "bottom"},
            {"id": "walk_up", "kind": "animation", "frame_count": 6, "description": "walking away from camera/back/up direction", "layout": "strip-h", "loop": True, "fps": 8, "anchor": "bottom"},
            {"id": "walk_left", "kind": "animation", "frame_count": 6, "description": "side-view walk cycle facing left", "layout": "strip-h", "loop": True, "fps": 8, "anchor": "bottom"},
            {"id": "walk_right", "kind": "animation", "frame_count": 6, "description": "side-view walk cycle facing right", "layout": "strip-h", "loop": True, "fps": 8, "anchor": "bottom"},
        ]
    if asset_type in {"furniture", "prop", "object"}:
        return [
            {"id": "clean", "kind": "state", "frame_count": 1, "description": "clean/tidy state", "layout": "single", "loop": False, "fps": 1, "anchor": "center"},
            {"id": "dirty", "kind": "state", "frame_count": 1, "description": "dirty/messy state of the same object", "layout": "single", "loop": False, "fps": 1, "anchor": "center"},
        ]
    if asset_type in {"map", "room", "dollhouse"}:
        return [
            {"id": "map_base", "kind": "map", "frame_count": 1, "description": "single clean map or room background with no UI labels", "layout": "single", "loop": False, "fps": 1, "anchor": "center"},
        ]
    return [{"id": "default", "kind": "sprite", "frame_count": 1, "description": "single game-ready sprite", "layout": "single", "loop": False, "fps": 1, "anchor": "center"}]


def make_prompt(request: Dict[str, Any], job: Dict[str, Any]) -> str:
    atlas = request["atlas"]
    asset_name = request["asset_name"]
    asset_type = request["asset_type"]
    style = request.get("style_notes") or "use the provided style reference or the user-described style exactly"
    visual_desc = request.get("description") or asset_name
    key = atlas.get("chroma_key", "#00ff00")
    cell_w, cell_h = atlas["cell_width"], atlas["cell_height"]
    frame_count = int(job.get("frame_count", 1))
    layout = job.get("layout", "strip-h")
    if job["id"] == "base":
        return f"""Create the canonical base reference for a game sprite asset.

Asset name: {asset_name}
Asset type: {asset_type}
Description: {visual_desc}
Style target: {style}

Output one centered full-body/object reference image on a perfectly flat chroma-key background {key}. The asset must be readable as a game sprite and suitable for cutting out into transparent PNG frames. No text, labels, captions, UI panels, borders, grid lines, watermarks, scenery, cast shadow, drop shadow, glow, or floor patch. Preserve any supplied reference images as identity and style anchors.
"""
    if frame_count == 1:
        return f"""Create one game-ready sprite state for `{asset_name}`.

Asset type: {asset_type}
State/variant id: {job['id']}
State description: {job.get('description', job['id'])}
Canonical description: {visual_desc}
Style target: {style}

Make this state look like the same asset as the canonical base reference. Render it as a complete centered sprite/object on a perfectly flat chroma-key background {key}, with safe padding for a {cell_w}x{cell_h} transparent cell. No text, labels, UI, frame numbers, grid, border, white background, scene background, cast shadow, drop shadow, glow, or detached effects. Keep the silhouette clean and easy to key out.
"""
    return f"""Create a {frame_count}-frame animation sprite strip for `{asset_name}`.

Animation id: {job['id']}
Animation description: {job.get('description', job['id'])}
Layout: {layout}; place exactly {frame_count} complete frames left-to-right, evenly spaced, one pose per slot.
Canonical description: {visual_desc}
Style target: {style}
Cell target after processing: {cell_w}x{cell_h}; keep safe padding inside each slot.

Use the canonical base reference and any user references as the identity/style lock. Every frame must be the same character/object, same proportions, same palette, same materials, and same silhouette language. Show the requested motion through pose changes only. Do not add text, labels, frame numbers, visible grid, borders, UI, white background, scenery, cast shadows, drop shadows, floor shadows, dust, speed lines, motion trails, glows, or detached effects unless the user explicitly requested a small attached opaque effect. Use a perfectly flat chroma-key background {key} across the entire strip.
"""


def build_request(args: argparse.Namespace) -> Dict[str, Any]:
    if args.config:
        data = load_json(Path(args.config))
    else:
        outputs = []
        for s in args.animation or []:
            outputs.append(parse_output_spec(s, "animation"))
        for s in args.state or []:
            outputs.append(parse_output_spec(s, "state"))
        for s in args.variant or []:
            outputs.append(parse_output_spec(s, "variant"))
        asset_type = args.asset_type
        if not outputs:
            outputs = default_outputs(asset_type)
        cell_w, cell_h = parse_size(args.cell_size, (256, 256))
        data = {
            "asset_name": args.asset_name,
            "slug": slugify(args.asset_name),
            "asset_type": asset_type,
            "description": args.description or args.asset_name,
            "style_notes": args.style_notes or "",
            "references": args.reference or [],
            "outputs": outputs,
            "atlas": {
                "cell_width": cell_w,
                "cell_height": cell_h,
                "columns": args.columns,
                "padding": args.padding,
                "background": args.background,
                "chroma_key": args.chroma_key,
                "chroma_tolerance": args.chroma_tolerance,
            },
            "godot": {"texture_path": args.godot_texture_path or f"res://assets/sprites/{slugify(args.asset_name)}/spritesheet.png"},
        }
    data.setdefault("slug", slugify(data.get("asset_name", "sprite-asset")))
    data.setdefault("references", [])
    data.setdefault("outputs", default_outputs(data.get("asset_type", "sprite")))
    data.setdefault("atlas", {})
    data["atlas"].setdefault("cell_width", 256)
    data["atlas"].setdefault("cell_height", 256)
    data["atlas"].setdefault("columns", max([int(o.get("frame_count", 1)) for o in data["outputs"]] + [1, args.columns if hasattr(args, "columns") else 1]))
    data["atlas"].setdefault("padding", 12)
    data["atlas"].setdefault("background", "chroma")
    data["atlas"].setdefault("chroma_key", "#00ff00")
    data["atlas"].setdefault("chroma_tolerance", 42)
    data.setdefault("godot", {})
    data["godot"].setdefault("texture_path", f"res://assets/sprites/{data['slug']}/spritesheet.png")
    return data


def main() -> None:
    ap = argparse.ArgumentParser(description="Prepare a sprite generation run folder and prompt manifest.")
    ap.add_argument("--config", help="Advanced JSON request file. Overrides most CLI options.")
    ap.add_argument("--asset-name", default="Sprite Asset")
    ap.add_argument("--asset-type", default="character", choices=["character", "npc", "player", "furniture", "prop", "object", "map", "room", "dollhouse", "sprite"])
    ap.add_argument("--description", default="")
    ap.add_argument("--style-notes", default="")
    ap.add_argument("--reference", action="append", help="Reference image path. May be repeated.")
    ap.add_argument("--animation", action="append", help="id:frames:description[:layout][:loop|once]. May be repeated.")
    ap.add_argument("--state", action="append", help="id:frames:description[:layout][:loop|once]. May be repeated.")
    ap.add_argument("--variant", action="append", help="id:frames:description[:layout][:loop|once]. May be repeated.")
    ap.add_argument("--cell-size", default="256x256")
    ap.add_argument("--columns", type=int, default=8)
    ap.add_argument("--padding", type=int, default=12)
    ap.add_argument("--background", default="chroma", choices=["chroma", "transparent"])
    ap.add_argument("--chroma-key", default="#00ff00")
    ap.add_argument("--chroma-tolerance", type=int, default=42)
    ap.add_argument("--godot-texture-path", default="")
    ap.add_argument("--output-dir", default="")
    ap.add_argument("--force", action="store_true")
    args = ap.parse_args()

    request = build_request(args)
    slug = request["slug"]
    out_dir = Path(args.output_dir or Path.cwd() / f"{slug}-sprite-run").resolve()
    if out_dir.exists() and any(out_dir.iterdir()) and not args.force:
        raise SystemExit(f"Output dir exists and is not empty: {out_dir}. Use --force to overwrite manifests.")
    ensure_dir(out_dir)
    for sub in ["prompts", "references", "references/layout-guides", "decoded", "frames", "final", "qa", "godot"]:
        ensure_dir(out_dir / sub)

    # Copy request references into the run folder for stable paths.
    stable_refs = []
    for ref in request.get("references", []):
        p = Path(ref).expanduser().resolve()
        if p.exists():
            dst = out_dir / "references" / p.name
            if p != dst:
                import shutil
                shutil.copy2(p, dst)
            stable_refs.append(str(dst))
        else:
            stable_refs.append(str(p))
    request["references"] = stable_refs
    save_json(out_dir / "asset_request.json", request)

    jobs = []
    base_job = {
        "id": "base",
        "kind": "base",
        "frame_count": 1,
        "layout": "single",
        "status": "pending",
        "requires": [],
        "input_images": [{"path": p, "role": "user style/identity reference"} for p in request.get("references", [])],
        "prompt_path": str(out_dir / "prompts" / "base.txt"),
        "decoded_path": str(out_dir / "decoded" / "base.png"),
    }
    (out_dir / "prompts" / "base.txt").write_text(make_prompt(request, base_job), encoding="utf-8")
    jobs.append(base_job)

    cell_w, cell_h = int(request["atlas"]["cell_width"]), int(request["atlas"]["cell_height"])
    chroma = parse_color(request["atlas"].get("chroma_key", "#00ff00"))
    for output in request.get("outputs", []):
        job = dict(output)
        job.setdefault("status", "pending")
        job.setdefault("requires", ["base"])
        job.setdefault("layout", "single" if int(job.get("frame_count", 1)) == 1 else "strip-h")
        guide_path = out_dir / "references" / "layout-guides" / f"{job['id']}.png"
        make_layout_guide(guide_path, int(job.get("frame_count", 1)), cell_w, cell_h, layout=job.get("layout", "strip-h"), chroma=chroma, title=job["id"])
        job["layout_guide"] = str(guide_path)
        job["input_images"] = [{"path": str(guide_path), "role": "layout-only guide; do not copy visible marks"}]
        for p in request.get("references", []):
            job["input_images"].append({"path": p, "role": "user style/identity reference"})
        job["prompt_path"] = str(out_dir / "prompts" / f"{job['id']}.txt")
        job["decoded_path"] = str(out_dir / "decoded" / f"{job['id']}.png")
        (out_dir / "prompts" / f"{job['id']}.txt").write_text(make_prompt(request, job), encoding="utf-8")
        jobs.append(job)

    manifest = {
        "run_dir": str(out_dir),
        "asset_name": request.get("asset_name"),
        "slug": slug,
        "jobs": jobs,
    }
    save_json(out_dir / "imagegen-jobs.json", manifest)
    print(f"Prepared sprite run: {out_dir}")
    print(f"Jobs: {', '.join(j['id'] for j in jobs)}")
    print("Next: generate the base job with the prompt and input images listed in imagegen-jobs.json, then record it with record_imagegen_result.py.")


if __name__ == "__main__":
    main()
