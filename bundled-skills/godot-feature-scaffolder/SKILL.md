---
name: godot-feature-scaffolder
description: Break a gameplay feature into Godot scenes, scripts, assets, tasks, acceptance criteria, and integration handoffs. Use for feature planning, mechanic definition, TODO breakdowns, and scaffolding feature modules inside a Godot project.
---

# Godot Feature Scaffolder

## Purpose

Turn a gameplay idea into a concrete feature module that can be implemented in Godot.

Examples:

- click-to-move pathing
- resource collection loop
- shop interaction system
- timing minigame
- inventory or task checklist
- character emotion state machine

## Output

```text
design/features/<feature_slug>/
  feature_spec.json
  tasks.md
  acceptance_criteria.md
  asset_requests.json
  scene_plan.md
  script_plan.md
```

## Workflow

```bash
SKILL_DIR="${CODEX_HOME:-$HOME/.codex}/skills/godot-feature-scaffolder"
python "$SKILL_DIR/scripts/create_feature_spec.py" \
  --project-dir /absolute/path/to/godot_project \
  --feature-name "Click To Move Pathing" \
  --kind movement \
  --summary "Tap a destination and have the player walk there." \
  --assets player_walk_sprite destination_marker path_dots
```

After the feature is defined, route scenes to `godot-scene-builder`, UI to `godot-ui-kit-generator`, and art to the correct sprite skill.
