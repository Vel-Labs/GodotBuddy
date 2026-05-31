---
name: godot-sprite-importer
description: Convert generated sprite outputs into Godot-ready import manifests, copied asset folders, starter SpriteFrames resources, node setup notes, and validation summaries. Use after sprite-generator or a project-local sprite worker has produced PNG/WebP sheets or frame folders.
---

# Godot Sprite Importer

## Purpose

Bridge generated sprite assets into a Godot project.

This skill does not create art. It packages generated art for Godot import.

## Inputs

- generated sprite pack folder
- `spritesheet.png` or `spritesheet.webp`
- optional `frames/frames-manifest.json`
- optional separate frame PNGs

## Outputs

```text
project/assets/sprites/<pack_name>/
  spritesheet.png
  spritesheet.webp
  frames/
  import_manifest.json
  node_setup_notes.md
  <pack_name>_spriteframes.tres
```

## Workflow

```bash
SKILL_DIR="${CODEX_HOME:-$HOME/.codex}/skills/godot-sprite-importer"
python "$SKILL_DIR/scripts/import_sprite_pack.py" \
  --project-dir /absolute/path/to/godot_project \
  --pack-name couch_states \
  --source-dir /absolute/path/to/generated_sprite_pack
```

If a manifest contains grid/cell data, use `create_spriteframes_tres.py` to make a starter `SpriteFrames` resource.
