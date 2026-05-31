#!/usr/bin/env python3
import argparse, json
from pathlib import Path

try:
    from PIL import Image
except Exception:
    Image = None

IMAGE_EXTS = {'.png', '.webp', '.jpg', '.jpeg'}

def transparent_bounds(img):
    if img.mode != 'RGBA':
        return None
    alpha = img.getchannel('A')
    return alpha.getbbox()

def audit_image(path):
    item = {'path': str(path), 'bytes': path.stat().st_size}
    if Image is None:
        item['warning'] = 'Pillow not available; dimensions not checked'
        return item
    try:
        with Image.open(path) as img:
            item['width'], item['height'] = img.size
            item['mode'] = img.mode
            item['megapixels'] = round((img.width * img.height) / 1_000_000, 3)
            if img.width > 2048 or img.height > 2048:
                item.setdefault('warnings', []).append('large_texture_over_2048')
            if img.width > 4096 or img.height > 4096:
                item.setdefault('warnings', []).append('very_large_texture_over_4096')
            if img.mode == 'RGBA':
                bbox = transparent_bounds(img)
                if bbox:
                    used_area = (bbox[2] - bbox[0]) * (bbox[3] - bbox[1])
                    full_area = img.width * img.height
                    waste = 1 - (used_area / full_area) if full_area else 0
                    item['transparent_margin_waste_estimate'] = round(waste, 3)
                    if waste > 0.65:
                        item.setdefault('warnings', []).append('high_transparent_padding')
    except Exception as exc:
        item.setdefault('warnings', []).append('could_not_open_image')
        item['error'] = str(exc)
    return item

def main():
    p = argparse.ArgumentParser(description='Audit image assets for mobile Godot readiness.')
    p.add_argument('--project-dir', required=True)
    p.add_argument('--output-dir', required=True)
    args = p.parse_args()
    project = Path(args.project_dir)
    out = Path(args.output_dir)
    out.mkdir(parents=True, exist_ok=True)
    images = [p for p in project.rglob('*') if p.suffix.lower() in IMAGE_EXTS]
    rows = [audit_image(p) for p in images]
    summary = {
        'project_dir': str(project),
        'image_count': len(rows),
        'total_bytes': sum(r.get('bytes', 0) for r in rows),
        'images': rows
    }
    (out / 'asset_audit.json').write_text(json.dumps(summary, indent=2))
    lines = ['# Godot Mobile Asset Audit', '', f'Images scanned: {len(rows)}', f'Total bytes: {summary["total_bytes"]}', '']
    flagged = [r for r in rows if r.get('warnings')]
    lines += [f'Flagged images: {len(flagged)}', '']
    for r in flagged[:100]:
        lines.append(f'- `{r["path"]}`: {", ".join(r.get("warnings", []))}')
    (out / 'asset_audit.md').write_text('\n'.join(lines) + '\n')
    print(out / 'asset_audit.md')

if __name__ == '__main__':
    main()
