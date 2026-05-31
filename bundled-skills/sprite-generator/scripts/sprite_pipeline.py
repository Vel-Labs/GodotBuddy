
#!/usr/bin/env python3
'''Shared deterministic utilities for sprite-generator skill packs.

These helpers intentionally do not create original art. They only prepare
layout guides, ingest generated images, remove a flat chroma key when requested,
extract frames, compose atlases, generate QA media, and write Godot starter files.
'''
from __future__ import annotations

import json
import math
import os
import re
import shutil
from dataclasses import dataclass
from pathlib import Path
from textwrap import dedent
from typing import Any, Dict, Iterable, List, Optional, Sequence, Tuple

try:
    from PIL import Image, ImageDraw, ImageFont, ImageSequence
except Exception as exc:  # pragma: no cover
    raise SystemExit("This script requires Pillow. Install with: python -m pip install pillow") from exc

Color = Tuple[int, int, int]


def slugify(value: str, fallback: str = "sprite-asset") -> str:
    value = (value or "").strip().lower()
    value = re.sub(r"[^a-z0-9]+", "-", value)
    value = value.strip("-")
    return value or fallback


def ensure_dir(path: Path) -> Path:
    path.mkdir(parents=True, exist_ok=True)
    return path


def load_json(path: Path) -> Dict[str, Any]:
    with path.open("r", encoding="utf-8") as f:
        return json.load(f)


def save_json(path: Path, data: Dict[str, Any]) -> None:
    ensure_dir(path.parent)
    with path.open("w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
        f.write("\n")


def parse_size(value: str, default: Tuple[int, int] = (256, 256)) -> Tuple[int, int]:
    if not value:
        return default
    m = re.match(r"^\s*(\d+)\s*[x,]\s*(\d+)\s*$", value.lower())
    if not m:
        raise ValueError(f"Expected size like 256x256, got {value!r}")
    return int(m.group(1)), int(m.group(2))


def parse_color(value: str | Sequence[int] | None, default: Color = (0, 255, 0)) -> Color:
    if value is None:
        return default
    if isinstance(value, (list, tuple)) and len(value) >= 3:
        return int(value[0]), int(value[1]), int(value[2])
    s = str(value).strip()
    if s.startswith("#") and len(s) == 7:
        return int(s[1:3], 16), int(s[3:5], 16), int(s[5:7], 16)
    parts = [p.strip() for p in s.split(",")]
    if len(parts) == 3:
        return int(parts[0]), int(parts[1]), int(parts[2])
    named = {
        "green": (0, 255, 0),
        "chroma-green": (0, 255, 0),
        "magenta": (255, 0, 255),
        "blue": (0, 0, 255),
    }
    if s.lower() in named:
        return named[s.lower()]
    raise ValueError(f"Unsupported color {value!r}; use #RRGGBB or r,g,b")


def color_distance_sq(a: Tuple[int, int, int], b: Tuple[int, int, int]) -> int:
    return (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2


def remove_chroma(image: Image.Image, key: Color = (0, 255, 0), tolerance: int = 42) -> Image.Image:
    '''Return RGBA image with pixels near key made transparent.

    Uses a conservative RGB-distance test plus a green-screen dominance guard for
    slightly compressed greens. This is deterministic cleanup, not art creation.
    '''
    img = image.convert("RGBA")
    tol_sq = tolerance * tolerance
    out = []
    for r, g, b, a in img.getdata():
        rgb = (r, g, b)
        near_key = color_distance_sq(rgb, key) <= tol_sq
        # Useful for generated images that shade the flat green background a bit.
        green_dominant = key[1] > 200 and g > 150 and g > r + 50 and g > b + 50
        if a == 0 or near_key or green_dominant:
            out.append((r, g, b, 0))
        else:
            out.append((r, g, b, a))
    img.putdata(out)
    return img


def alpha_bbox(image: Image.Image) -> Optional[Tuple[int, int, int, int]]:
    img = image.convert("RGBA")
    return img.getchannel("A").getbbox()


def fit_to_cell(image: Image.Image, cell_w: int, cell_h: int, padding: int = 12, anchor: str = "center") -> Image.Image:
    img = image.convert("RGBA")
    bbox = alpha_bbox(img)
    canvas = Image.new("RGBA", (cell_w, cell_h), (0, 0, 0, 0))
    if not bbox:
        return canvas
    sprite = img.crop(bbox)
    max_w = max(1, cell_w - padding * 2)
    max_h = max(1, cell_h - padding * 2)
    sprite.thumbnail((max_w, max_h), Image.Resampling.LANCZOS)
    if anchor == "bottom":
        x = (cell_w - sprite.width) // 2
        y = cell_h - padding - sprite.height
    elif anchor == "top":
        x = (cell_w - sprite.width) // 2
        y = padding
    else:
        x = (cell_w - sprite.width) // 2
        y = (cell_h - sprite.height) // 2
    canvas.alpha_composite(sprite, (x, y))
    return canvas


def split_strip_fixed(image: Image.Image, frame_count: int, layout: str = "strip-h", grid_cols: Optional[int] = None, grid_rows: Optional[int] = None) -> List[Image.Image]:
    if frame_count <= 0:
        raise ValueError("frame_count must be > 0")
    img = image.convert("RGBA")
    frames: List[Image.Image] = []
    layout = layout or "strip-h"
    if layout == "single":
        return [img]
    if layout == "strip-v":
        slot_h = img.height / frame_count
        for i in range(frame_count):
            top = round(i * slot_h)
            bottom = round((i + 1) * slot_h)
            frames.append(img.crop((0, top, img.width, bottom)))
        return frames
    if layout == "grid":
        cols = grid_cols or math.ceil(math.sqrt(frame_count))
        rows = grid_rows or math.ceil(frame_count / cols)
        slot_w = img.width / cols
        slot_h = img.height / rows
        for i in range(frame_count):
            c = i % cols
            r = i // cols
            left = round(c * slot_w)
            right = round((c + 1) * slot_w)
            top = round(r * slot_h)
            bottom = round((r + 1) * slot_h)
            frames.append(img.crop((left, top, right, bottom)))
        return frames
    # Default horizontal strip.
    slot_w = img.width / frame_count
    for i in range(frame_count):
        left = round(i * slot_w)
        right = round((i + 1) * slot_w)
        frames.append(img.crop((left, 0, right, img.height)))
    return frames


def make_layout_guide(path: Path, frame_count: int, cell_w: int, cell_h: int, layout: str = "strip-h", chroma: Color = (0, 255, 0), title: str = "") -> None:
    ensure_dir(path.parent)
    if layout == "strip-v":
        w, h = cell_w, cell_h * frame_count
    elif layout == "grid":
        cols = math.ceil(math.sqrt(frame_count))
        rows = math.ceil(frame_count / cols)
        w, h = cols * cell_w, rows * cell_h
    else:
        w, h = cell_w * frame_count, cell_h
    img = Image.new("RGB", (w, h), chroma)
    draw = ImageDraw.Draw(img)
    line = (255, 255, 255)
    fill = (20, 120, 20)
    try:
        font = ImageFont.load_default()
    except Exception:
        font = None
    if layout == "strip-v":
        for i in range(frame_count):
            y = i * cell_h
            draw.rectangle((0, y, cell_w - 1, y + cell_h - 1), outline=line, width=2)
            draw.text((8, y + 8), str(i + 1), fill=fill, font=font)
    elif layout == "grid":
        cols = math.ceil(math.sqrt(frame_count))
        for i in range(frame_count):
            c, r = i % cols, i // cols
            x, y = c * cell_w, r * cell_h
            draw.rectangle((x, y, x + cell_w - 1, y + cell_h - 1), outline=line, width=2)
            draw.text((x + 8, y + 8), str(i + 1), fill=fill, font=font)
    else:
        for i in range(frame_count):
            x = i * cell_w
            draw.rectangle((x, 0, x + cell_w - 1, cell_h - 1), outline=line, width=2)
            draw.text((x + 8, 8), str(i + 1), fill=fill, font=font)
    if title:
        draw.text((8, max(8, h - 18)), f"layout guide: {title}; do not copy lines/text", fill=fill, font=font)
    img.save(path)


def extract_job_frames(job: Dict[str, Any], source_path: Path, out_dir: Path, request: Dict[str, Any]) -> List[Path]:
    atlas = request.get("atlas", {})
    cell_w = int(atlas.get("cell_width", 256))
    cell_h = int(atlas.get("cell_height", 256))
    padding = int(atlas.get("padding", 12))
    key = parse_color(atlas.get("chroma_key", "#00ff00"))
    tolerance = int(atlas.get("chroma_tolerance", 42))
    anchor = job.get("anchor") or ("bottom" if request.get("asset_type") in {"character", "npc", "player"} else "center")
    frame_count = int(job.get("frame_count", 1))
    layout = job.get("layout", "strip-h")
    img = Image.open(source_path).convert("RGBA")
    if atlas.get("background", "chroma") == "chroma":
        img = remove_chroma(img, key=key, tolerance=tolerance)
    raw_frames = split_strip_fixed(img, frame_count, layout=layout, grid_cols=job.get("grid_cols"), grid_rows=job.get("grid_rows"))
    frame_paths = []
    ensure_dir(out_dir)
    for i, frame in enumerate(raw_frames):
        fitted = fit_to_cell(frame, cell_w, cell_h, padding=padding, anchor=anchor)
        fname = f"{job['id']}_{i:02d}.png"
        path = out_dir / fname
        fitted.save(path)
        frame_paths.append(path)
    return frame_paths


def compose_atlas(rows: List[Tuple[str, List[Path]]], out_path: Path, request: Dict[str, Any]) -> Dict[str, Any]:
    atlas = request.get("atlas", {})
    cell_w = int(atlas.get("cell_width", 256))
    cell_h = int(atlas.get("cell_height", 256))
    columns = int(atlas.get("columns", max([len(f) for _, f in rows] or [1])))
    if any(len(paths) > columns for _, paths in rows):
        offenders = [rid for rid, paths in rows if len(paths) > columns]
        raise ValueError(f"Frame count exceeds atlas columns for rows: {', '.join(offenders)}")
    out = Image.new("RGBA", (columns * cell_w, len(rows) * cell_h), (0, 0, 0, 0))
    manifest_rows = []
    for r, (row_id, paths) in enumerate(rows):
        row_frames = []
        for c, frame_path in enumerate(paths):
            frame = Image.open(frame_path).convert("RGBA")
            out.alpha_composite(frame, (c * cell_w, r * cell_h))
            row_frames.append({
                "index": c,
                "path": str(frame_path),
                "region": [c * cell_w, r * cell_h, cell_w, cell_h],
            })
        manifest_rows.append({"id": row_id, "row": r, "frames": row_frames})
    ensure_dir(out_path.parent)
    out.save(out_path)
    # Save webp when Pillow supports it.
    try:
        webp_path = out_path.with_suffix(".webp")
        out.save(webp_path, lossless=True, quality=100, method=6)
    except Exception:
        webp_path = None
    return {
        "path": str(out_path),
        "webp_path": str(webp_path) if webp_path else None,
        "cell_width": cell_w,
        "cell_height": cell_h,
        "columns": columns,
        "rows": len(rows),
        "animations": manifest_rows,
    }


def make_contact_sheet(rows: List[Tuple[str, List[Path]]], out_path: Path, request: Dict[str, Any]) -> None:
    atlas = request.get("atlas", {})
    cell_w = int(atlas.get("cell_width", 256))
    cell_h = int(atlas.get("cell_height", 256))
    label_w = 180
    gap = 8
    columns = int(atlas.get("columns", max([len(f) for _, f in rows] or [1])))
    sheet_w = label_w + columns * cell_w + gap * 2
    sheet_h = max(1, len(rows)) * (cell_h + gap) + gap
    bg = (245, 245, 238, 255)
    img = Image.new("RGBA", (sheet_w, sheet_h), bg)
    draw = ImageDraw.Draw(img)
    try:
        font = ImageFont.load_default()
    except Exception:
        font = None
    for r, (row_id, paths) in enumerate(rows):
        y = gap + r * (cell_h + gap)
        draw.text((12, y + 12), row_id, fill=(35, 35, 35, 255), font=font)
        for c in range(columns):
            x = label_w + c * cell_w + gap
            draw.rectangle((x, y, x + cell_w - 1, y + cell_h - 1), outline=(180, 180, 180, 255), width=1)
            if c < len(paths):
                frame = Image.open(paths[c]).convert("RGBA")
                img.alpha_composite(frame, (x, y))
                draw.text((x + 4, y + 4), str(c + 1), fill=(80, 80, 80, 255), font=font)
    ensure_dir(out_path.parent)
    img.convert("RGB").save(out_path)


def validate_rows(rows: List[Tuple[str, List[Path]]], request: Dict[str, Any], atlas_manifest: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    atlas = request.get("atlas", {})
    cell_w = int(atlas.get("cell_width", 256))
    cell_h = int(atlas.get("cell_height", 256))
    errors = []
    warnings = []
    frame_records = []
    for row_id, paths in rows:
        if not paths:
            errors.append(f"{row_id}: no frames extracted")
            continue
        alpha_areas = []
        for i, p in enumerate(paths):
            img = Image.open(p).convert("RGBA")
            if img.size != (cell_w, cell_h):
                errors.append(f"{row_id}[{i}]: expected {cell_w}x{cell_h}, got {img.size[0]}x{img.size[1]}")
            bbox = alpha_bbox(img)
            if not bbox:
                errors.append(f"{row_id}[{i}]: empty transparent frame")
                alpha_areas.append(0)
            else:
                alpha_areas.append((bbox[2] - bbox[0]) * (bbox[3] - bbox[1]))
                margin = 2
                if bbox[0] <= margin or bbox[1] <= margin or bbox[2] >= cell_w - margin or bbox[3] >= cell_h - margin:
                    warnings.append(f"{row_id}[{i}]: sprite is close to the cell edge; inspect for cropping")
            frame_records.append({"row": row_id, "index": i, "path": str(p), "alpha_bbox": bbox})
        nonzero = [a for a in alpha_areas if a > 0]
        if nonzero:
            avg = sum(nonzero) / len(nonzero)
            for i, area in enumerate(alpha_areas):
                if area > 0 and (area < avg * 0.35 or area > avg * 2.6):
                    warnings.append(f"{row_id}[{i}]: size outlier relative to the row")
    if atlas_manifest:
        expected_w = int(atlas_manifest["columns"]) * cell_w
        expected_h = int(atlas_manifest["rows"]) * cell_h
        atlas_path = atlas_manifest.get("path")
        if atlas_path and Path(atlas_path).exists():
            img = Image.open(atlas_path)
            if img.size != (expected_w, expected_h):
                errors.append(f"atlas size mismatch: expected {expected_w}x{expected_h}, got {img.size[0]}x{img.size[1]}")
    return {"errors": errors, "warnings": warnings, "frames": frame_records}


def write_preview_gifs(rows: List[Tuple[str, List[Path]]], out_dir: Path, request: Dict[str, Any]) -> List[str]:
    ensure_dir(out_dir)
    paths = []
    outputs = {o["id"]: o for o in request.get("outputs", [])}
    for row_id, frame_paths in rows:
        if len(frame_paths) < 2:
            continue
        frames = [Image.open(p).convert("RGBA") for p in frame_paths]
        durations = outputs.get(row_id, {}).get("durations_ms") or [120] * len(frames)
        if isinstance(durations, int):
            durations = [durations] * len(frames)
        if len(durations) < len(frames):
            durations = durations + [durations[-1] if durations else 120] * (len(frames) - len(durations))
        out = out_dir / f"{row_id}.gif"
        frames[0].save(out, save_all=True, append_images=frames[1:], duration=durations[:len(frames)], loop=0, disposal=2)
        paths.append(str(out))
    return paths


def godot_string(value: str) -> str:
    return value.replace('\\', '\\\\').replace('"', '\\"')


def write_godot_files(run_dir: Path, request: Dict[str, Any], atlas_manifest: Dict[str, Any], rows: List[Tuple[str, List[Path]]]) -> Dict[str, str]:
    slug = request.get("slug") or slugify(request.get("asset_name", "sprite-asset"))
    godot_dir = ensure_dir(run_dir / "godot")
    final_dir = run_dir / "final"
    atlas_filename = Path(atlas_manifest["path"]).name
    rel_texture_path = request.get("godot", {}).get("texture_path", f"res://assets/sprites/{slug}/{atlas_filename}")
    cell_w = int(atlas_manifest["cell_width"])
    cell_h = int(atlas_manifest["cell_height"])
    outputs = {o["id"]: o for o in request.get("outputs", [])}

    # SpriteFrames resource using AtlasTexture subresources.
    subresources = []
    anim_entries = []
    sub_id = 1
    for row_index, (row_id, frame_paths) in enumerate(rows):
        frame_entries = []
        for col_index, _ in enumerate(frame_paths):
            sid = f"AtlasTexture_{row_id}_{col_index}"
            x = col_index * cell_w
            y = row_index * cell_h
            subresources.append(dedent(f'''\
            [sub_resource type="AtlasTexture" id="{sid}"]
            atlas = ExtResource("1_sheet")
            region = Rect2({x}, {y}, {cell_w}, {cell_h})
            ''').strip())
            frame_entries.append(f'{{"duration": 1.0, "texture": SubResource("{sid}")}}')
            sub_id += 1
        out_cfg = outputs.get(row_id, {})
        loop = "true" if out_cfg.get("loop", True) else "false"
        speed = float(out_cfg.get("fps", 8 if len(frame_paths) > 1 else 1))
        anim_entries.append(dedent(f'''\
        {{
        "frames": [{", ".join(frame_entries)}],
        "loop": {loop},
        "name": &"{godot_string(row_id)}",
        "speed": {speed}
        }}''').strip())

    spriteframes = (
        f'[gd_resource type="SpriteFrames" load_steps={2 + len(subresources)} format=3]\n\n'
        f'[ext_resource type="Texture2D" path="{godot_string(rel_texture_path)}" id="1_sheet"]\n\n'
        + "\n\n".join(subresources)
        + "\n\n[resource]\n"
        + f'animations = [{", ".join(anim_entries)}]\n'
    )
    spriteframes_path = godot_dir / f"{slug}_spriteframes.tres"
    spriteframes_path.write_text(spriteframes, encoding="utf-8")

    first_animation = rows[0][0] if rows else "default"
    scene = (
        "[gd_scene load_steps=2 format=3]\n\n"
        f'[ext_resource type="SpriteFrames" path="res://assets/sprites/{slug}/{slug}_spriteframes.tres" id="1_frames"]\n\n'
        f'[node name="{slug}" type="AnimatedSprite2D"]\n'
        'sprite_frames = ExtResource("1_frames")\n'
        f'animation = &"{first_animation}"\n'
        f'autoplay = "{first_animation}"\n'
        'centered = true\n'
    )
    scene_path = godot_dir / f"{slug}_animated_sprite_2d.tscn"
    scene_path.write_text(scene, encoding="utf-8")

    import_manifest = {
        "asset_name": request.get("asset_name"),
        "slug": slug,
        "asset_type": request.get("asset_type"),
        "texture": atlas_filename,
        "texture_path_hint": rel_texture_path,
        "cell_width": cell_w,
        "cell_height": cell_h,
        "columns": atlas_manifest["columns"],
        "rows": atlas_manifest["rows"],
        "animations": [
            {
                "name": row_id,
                "row": idx,
                "frame_count": len(paths),
                "fps": outputs.get(row_id, {}).get("fps", 8 if len(paths) > 1 else 1),
                "loop": outputs.get(row_id, {}).get("loop", True),
            }
            for idx, (row_id, paths) in enumerate(rows)
        ],
    }
    import_manifest_path = godot_dir / "godot_import_manifest.json"
    save_json(import_manifest_path, import_manifest)

    readme = (
        f"# Godot Import Notes: {request.get('asset_name', slug)}\n\n"
        "Generated by the sprite-generator deterministic packaging scripts.\n\n"
        "## Files to copy into your Godot project\n\n"
        f"Copy these files into `res://assets/sprites/{slug}/`:\n\n"
        f"- `final/{atlas_filename}`\n"
        f"- `godot/{slug}_spriteframes.tres`\n"
        f"- `godot/{slug}_animated_sprite_2d.tscn`\n"
        "- `godot/godot_import_manifest.json`\n\n"
        "The `.tres` and `.tscn` files are starter resources for Godot 4. If your project uses a different destination path, open the `.tres` file and update the `path=\"res://...\"` reference to the copied spritesheet.\n\n"
        "## Recommended texture import settings\n\n"
        "- Filter: off for crisp pixel or low-res assets; on for soft 3D-rendered sprites if desired.\n"
        "- Mipmaps: off for UI-scale sprites; optional for world-scale props.\n"
        "- Repeat: disabled.\n"
        "- Keep alpha enabled.\n\n"
        "## Runtime convention\n\n"
        "Animation names match `godot_import_manifest.json`. Use `AnimatedSprite2D.play(\"idle\")`, `play(\"walk_down\")`, etc.\n"
    )
    readme_path = godot_dir / "README_GODOT.md"
    readme_path.write_text(readme, encoding="utf-8")

    return {
        "spriteframes": str(spriteframes_path),
        "scene": str(scene_path),
        "manifest": str(import_manifest_path),
        "readme": str(readme_path),
    }


def copytree_files(src_paths: Iterable[Path], dest_dir: Path) -> List[str]:
    ensure_dir(dest_dir)
    copied = []
    for src in src_paths:
        src = Path(src)
        if src.exists() and src.is_file():
            dst = dest_dir / src.name
            shutil.copy2(src, dst)
            copied.append(str(dst))
    return copied
