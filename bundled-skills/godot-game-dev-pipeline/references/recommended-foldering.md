# Recommended Foldering

## Best default: sibling installable skills

Use this layout for the skill system:

```text
~/.codex/skills/
  godot-game-dev-pipeline/
  godot-project-scaffolder/
  godot-feature-scaffolder/
  godot-scene-builder/
  godot-ui-kit-generator/
  godot-sprite-importer/
  godot-mobile-optimization-checker/
  godot-export-packager/
  sprite-generator/
```

This keeps the pipeline clean and makes each worker skill directly callable.

## Local style workers

Project-specific style workers should be generated into the game workspace first. Promote or install them only when the user intentionally wants that style to become reusable.

## Project repository layout

Inside an actual Godot game repo, use a separate layout:

```text
game-root/
  project.godot
  scenes/
  scripts/
  assets/
    sprites/
    ui/
    audio/
  art_source/
  generated_assets/
  design/
  pipeline_runs/
  tools/
```
