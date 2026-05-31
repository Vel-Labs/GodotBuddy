---
name: godot-project-scaffolder
description: Create a Godot 4.x project skeleton for mobile-first, desktop-capable 2D games, including folders, starter scenes, scripts, README, asset directories, and project manifests. Use when a user wants a new Godot project structure or clean game repo foundation.
---

# Godot Project Scaffolder

## Purpose

Create the initial Godot project structure and baseline files for a mobile-first 2D game that also supports desktop/laptop.

## Default Output

```text
project-root/
  project.godot
  README.md
  scenes/
    Main.tscn
    rooms/
    ui/
  scripts/
    main.gd
    game_state.gd
    input_router.gd
  assets/
    sprites/
    ui/
    audio/
    fonts/
  generated_assets/
  art_source/
  design/
  pipeline_runs/
  exports/
  tools/
```

## Workflow

```bash
SKILL_DIR="${CODEX_HOME:-$HOME/.codex}/skills/godot-project-scaffolder"
python "$SKILL_DIR/scripts/create_godot_project.py" \
  --project-name "Starter Adventure" \
  --output-dir /absolute/path/to/starter_adventure \
  --preset mobile_2d \
  --force
```

## Handoff

After scaffolding, use:

- `godot-feature-scaffolder` for gameplay feature modules
- `godot-scene-builder` for scene bundles
- `godot-ui-kit-generator` for HUD/menu structures
- `godot-sprite-importer` for generated sprite sheets
