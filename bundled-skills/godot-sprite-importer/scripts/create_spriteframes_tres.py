#!/usr/bin/env python3
import argparse, json, hashlib
from pathlib import Path

def rid(prefix, text):
    return prefix + '_' + hashlib.sha1(text.encode()).hexdigest()[:8]

def main():
    p = argparse.ArgumentParser(description='Create a starter Godot SpriteFrames .tres from a grid manifest.')
    p.add_argument('--pack-dir', required=True)
    p.add_argument('--texture-path', required=True, help='Godot res:// path to spritesheet.png or .webp')
    p.add_argument('--output', default=None)
    p.add_argument('--fps', type=float, default=8.0)
    args = p.parse_args()

    pack = Path(args.pack_dir)
    manifest_path = pack / 'frames' / 'frames-manifest.json'
    if not manifest_path.exists():
        raise SystemExit('frames/frames-manifest.json not found')
    manifest = json.loads(manifest_path.read_text())
    frames = manifest.get('frames', [])
    out = Path(args.output) if args.output else pack / (pack.name + '_spriteframes.tres')
    lines = ['[gd_resource type="SpriteFrames" load_steps={} format=3]'.format(2 + len(frames)), '']
    tex_id = '1_texture'
    lines.append(f'[ext_resource type="Texture2D" path="{args.texture_path}" id="{tex_id}"]')
    lines.append('')
    sub_ids = []
    for i, frame in enumerate(frames, 1):
        sid = rid('AtlasTexture', frame.get('frame_id', str(i)) + str(i))
        sub_ids.append((sid, frame))
        region = frame.get('atlas_region') or frame.get('region') or [0, 0, manifest.get('cell_size', [256, 256])[0], manifest.get('cell_size', [256, 256])[1]]
        lines.append(f'[sub_resource type="AtlasTexture" id="{sid}"]')
        lines.append(f'atlas = ExtResource("{tex_id}")')
        lines.append(f'region = Rect2({region[0]}, {region[1]}, {region[2]}, {region[3]})')
        lines.append('')
    anims = []
    for sid, frame in sub_ids:
        name = frame.get('frame_id', 'frame')
        anims.append('{"frames": [{"duration": 1.0, "texture": SubResource("' + sid + '")}], "loop": true, "name": &' + json.dumps(name) + ', "speed": ' + str(args.fps) + '}')
    lines.append('[resource]')
    lines.append('animations = [' + ', '.join(anims) + ']')
    out.write_text('\n'.join(lines) + '\n')
    print(out)

if __name__ == '__main__':
    main()
