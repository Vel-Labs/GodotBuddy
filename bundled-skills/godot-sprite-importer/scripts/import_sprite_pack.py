#!/usr/bin/env python3
import argparse, json, shutil
from pathlib import Path

def copy_if_exists(src, dst):
    if src.exists():
        if src.is_dir():
            if dst.exists():
                shutil.rmtree(dst)
            shutil.copytree(src, dst)
        else:
            dst.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(src, dst)
        return True
    return False

def main():
    p = argparse.ArgumentParser(description='Copy a generated sprite pack into a Godot project assets folder.')
    p.add_argument('--project-dir', required=True)
    p.add_argument('--pack-name', required=True)
    p.add_argument('--source-dir', required=True)
    p.add_argument('--asset-subdir', default='assets/sprites')
    args = p.parse_args()

    project = Path(args.project_dir)
    src = Path(args.source_dir)
    dest = project / args.asset_subdir / args.pack_name
    dest.mkdir(parents=True, exist_ok=True)
    copied = []
    for name in ['spritesheet.png','spritesheet.webp','source_reference_sheet.png']:
        if copy_if_exists(src / name, dest / name):
            copied.append(name)
    if copy_if_exists(src / 'frames', dest / 'frames'):
        copied.append('frames/')
    if copy_if_exists(src / 'final' / 'spritesheet.png', dest / 'spritesheet.png'):
        copied.append('final/spritesheet.png -> spritesheet.png')
    if copy_if_exists(src / 'final' / 'spritesheet.webp', dest / 'spritesheet.webp'):
        copied.append('final/spritesheet.webp -> spritesheet.webp')
    if (src / 'frames').exists() and not (dest / 'frames').exists():
        copy_if_exists(src / 'frames', dest / 'frames')
        copied.append('frames/')

    manifest = {
        'pack_name': args.pack_name,
        'source_dir': str(src),
        'destination': str(dest),
        'copied': copied,
        'recommended_nodes': ['Sprite2D','AnimatedSprite2D'],
        'notes': ['Assign texture or SpriteFrames resource in Godot after import.']
    }
    (dest / 'import_manifest.json').write_text(json.dumps(manifest, indent=2))
    (dest / 'node_setup_notes.md').write_text(f'''# {args.pack_name} Node Setup\n\n- For static props: use `Sprite2D`.\n- For animated actors: use `AnimatedSprite2D`.\n- Keep this folder under `res://{args.asset_subdir}/{args.pack_name}/`.\n- Check frame pivots and scale in the scene.\n''')
    print(dest)

if __name__ == '__main__':
    main()
