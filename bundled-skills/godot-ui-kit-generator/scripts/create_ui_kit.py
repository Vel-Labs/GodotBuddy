#!/usr/bin/env python3
import argparse, json
from pathlib import Path

def snake(s):
    return ''.join(ch.lower() if ch.isalnum() else '_' for ch in s).strip('_') or 'ui_kit'

def main():
    p = argparse.ArgumentParser(description='Create a Godot UI kit scaffold.')
    p.add_argument('--project-dir', required=True)
    p.add_argument('--kit-name', required=True)
    p.add_argument('--screens', nargs='*', default=['hud'])
    p.add_argument('--icons', nargs='*', default=[])
    p.add_argument('--style-pack', default='generic')
    args = p.parse_args()

    project = Path(args.project_dir)
    kit = snake(args.kit_name)
    out = project / 'design' / 'ui_kits' / kit
    out.mkdir(parents=True, exist_ok=True)
    (project / 'scenes/ui').mkdir(parents=True, exist_ok=True)
    (project / 'scripts/ui').mkdir(parents=True, exist_ok=True)
    for screen in args.screens:
        s = snake(screen)
        (project / 'scenes/ui' / (s + '.tscn')).write_text(f'''[gd_scene load_steps=2 format=3]

[ext_resource type="Script" path="res://scripts/ui/{s}.gd" id="1_script"]

[node name="{s}" type="Control"]
layout_mode = 3
anchors_preset = 15
anchor_right = 1.0
anchor_bottom = 1.0
script = ExtResource("1_script")

[node name="SafeArea" type="MarginContainer" parent="."]
layout_mode = 1
anchors_preset = 15
anchor_right = 1.0
anchor_bottom = 1.0
''')
        (project / 'scripts/ui' / (s + '.gd')).write_text('''extends Control

func _ready() -> void:
    pass
''')
    route = 'sprite-generator'
    manifest = {
        'kit_name': args.kit_name,
        'style_pack': args.style_pack,
        'screens': args.screens,
        'icons': [{'name': i, 'route_to': route} for i in args.icons],
        'touch_target_minimum_px': 48
    }
    (out / 'ui_manifest.json').write_text(json.dumps(manifest, indent=2))
    (out / 'ui_art_requests.json').write_text(json.dumps({'icons': args.icons, 'style_pack': args.style_pack, 'route_to': route}, indent=2))
    (out / 'safe_area_notes.md').write_text('# Safe Area Notes\n\nUse containers and anchors. Keep primary actions away from notches and OS gestures.\n')
    print(out)

if __name__ == '__main__':
    main()
