---
name: godot-ui-kit-generator
description: Plan and scaffold mobile-first Godot UI/HUD/menu kits, including Control scene stubs, UI asset manifests, safe-area notes, touch target rules, and handoffs to sprite-generator for UI art. Use when the user needs buttons, HUD panels, menus, icons, meters, or mobile/desktop UI layout guidance.
---

# Godot UI Kit Generator

## Purpose

Create UI/HUD/menu structures and asset requests for Godot.

## Boundary

This skill designs and scaffolds the UI kit. For actual visual art generation, route texture/icon requests to:

- `sprite-generator` for generic UI art
- a project-local style worker only when the user has intentionally personalized and installed one

## Workflow

```bash
SKILL_DIR="${CODEX_HOME:-$HOME/.codex}/skills/godot-ui-kit-generator"
python "$SKILL_DIR/scripts/create_ui_kit.py" \
  --project-dir /absolute/path/to/godot_project \
  --kit-name first_playable_hud \
  --screens hud pause inventory \
  --icons confirm warning coin heart
```

## Defaults

- mobile-first safe-area aware layout
- touch target minimums
- desktop-compatible anchors
- UI asset manifest for generated icons/buttons/panels
