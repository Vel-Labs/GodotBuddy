---
name: godot-scene-builder
description: Create Godot `.tscn` scene starters and matching GDScript stubs for actors, props, rooms, interactables, UI containers, and click-to-move setups. Use when the user needs scene architecture or import-ready node hierarchies.
---

# Godot Scene Builder

## Purpose

Create reusable scene bundles for Godot.

## Scene Types

- `actor`: controllable or NPC character with `AnimatedSprite2D`
- `prop`: static/stateful interactable with `Sprite2D` and `Area2D`
- `room`: `Node2D` room shell with prop containers and navigation hooks
- `ui`: `Control` scene shell
- `click_to_move`: room/player setup for tap/click destination gameplay

## Workflow

```bash
SKILL_DIR="${CODEX_HOME:-$HOME/.codex}/skills/godot-scene-builder"
python "$SKILL_DIR/scripts/create_scene_bundle.py" \
  --project-dir /absolute/path/to/godot_project \
  --scene-name PlayerActor \
  --scene-type actor
```
