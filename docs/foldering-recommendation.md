# Foldering Recommendation

## Best install layout

Use sibling skills plus a GodotBuddy plugin/app.

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

Keep GodotBuddy as the orchestrator:

```text
~/.codex/plugins/cache/godotbuddy/...
# or npm-installed globally as `godotbuddy`
```

## Game repo layout

```text
my_godot_game/
  project.godot
  .godotbuddy/
  addons/godotbuddy/
  scenes/
  scripts/
  assets/
  generated_assets/
  art_source/
  design/
  pipeline_runs/
  exports/
```

## Why not only one mega skill folder?

A single mega skill is harder to discover, harder to update, and harder to reuse across future games. GodotBuddy should be the app. Skills should be modular workers.
