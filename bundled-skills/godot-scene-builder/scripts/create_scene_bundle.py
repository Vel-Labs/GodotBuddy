#!/usr/bin/env python3
import argparse
from pathlib import Path

def snake(s):
    return ''.join(ch.lower() if ch.isalnum() else '_' for ch in s).strip('_') or 'scene'

def pascal(s):
    return ''.join(part.capitalize() for part in snake(s).split('_')) or 'Scene'

def actor_tscn(script_path):
    return f'''[gd_scene load_steps=2 format=3]

[ext_resource type="Script" path="res://{script_path}" id="1_script"]

[node name="Actor" type="CharacterBody2D"]
script = ExtResource("1_script")

[node name="AnimatedSprite2D" type="AnimatedSprite2D" parent="."]

[node name="CollisionShape2D" type="CollisionShape2D" parent="."]

[node name="InteractionArea" type="Area2D" parent="."]
'''

def prop_tscn(script_path):
    return f'''[gd_scene load_steps=2 format=3]

[ext_resource type="Script" path="res://{script_path}" id="1_script"]

[node name="Prop" type="Node2D"]
script = ExtResource("1_script")

[node name="Sprite2D" type="Sprite2D" parent="."]

[node name="InteractionArea" type="Area2D" parent="."]

[node name="CollisionShape2D" type="CollisionShape2D" parent="InteractionArea"]
'''

def room_tscn(script_path):
    return f'''[gd_scene load_steps=2 format=3]

[ext_resource type="Script" path="res://{script_path}" id="1_script"]

[node name="Room" type="Node2D"]
script = ExtResource("1_script")

[node name="Background" type="Node2D" parent="."]

[node name="Props" type="Node2D" parent="."]

[node name="Characters" type="Node2D" parent="."]

[node name="Navigation" type="Node2D" parent="."]
'''

def ui_tscn(script_path):
    return f'''[gd_scene load_steps=2 format=3]

[ext_resource type="Script" path="res://{script_path}" id="1_script"]

[node name="UIScreen" type="Control"]
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
'''

def script_for(class_name, scene_type):
    if scene_type == 'actor':
        return f'''extends CharacterBody2D
class_name {class_name}

@export var move_speed: float = 180.0

func play_animation(name: String) -> void:
    if has_node("AnimatedSprite2D"):
        $AnimatedSprite2D.play(name)
'''
    if scene_type == 'prop':
        return f'''extends Node2D
class_name {class_name}

@export var state: String = "default"

func set_state(new_state: String) -> void:
    state = new_state
    # Update Sprite2D frame/texture here.
'''
    if scene_type == 'ui':
        return f'''extends Control
class_name {class_name}

func show_screen() -> void:
    visible = true

func hide_screen() -> void:
    visible = false
'''
    return f'''extends Node2D
class_name {class_name}

func _ready() -> void:
    pass
'''

def main():
    p = argparse.ArgumentParser(description='Create a Godot scene + script bundle.')
    p.add_argument('--project-dir', required=True)
    p.add_argument('--scene-name', required=True)
    p.add_argument('--scene-type', choices=['actor','prop','room','ui','click_to_move'], default='prop')
    args = p.parse_args()

    project = Path(args.project_dir)
    s = snake(args.scene_name)
    cname = pascal(args.scene_name)
    scene_subdir = 'ui' if args.scene_type == 'ui' else ('rooms' if args.scene_type in {'room','click_to_move'} else 'actors' if args.scene_type == 'actor' else 'props')
    scene_path = project / 'scenes' / scene_subdir / (s + '.tscn')
    script_path = Path('scripts') / scene_subdir / (s + '.gd')
    full_script_path = project / script_path
    scene_path.parent.mkdir(parents=True, exist_ok=True)
    full_script_path.parent.mkdir(parents=True, exist_ok=True)
    if args.scene_type == 'actor':
        tscn = actor_tscn(str(script_path))
    elif args.scene_type == 'prop':
        tscn = prop_tscn(str(script_path))
    elif args.scene_type == 'ui':
        tscn = ui_tscn(str(script_path))
    else:
        tscn = room_tscn(str(script_path))
    scene_path.write_text(tscn)
    full_script_path.write_text(script_for(cname, 'room' if args.scene_type == 'click_to_move' else args.scene_type))
    print(scene_path)
    print(full_script_path)

if __name__ == '__main__':
    main()
