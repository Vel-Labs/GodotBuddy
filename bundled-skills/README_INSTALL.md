# Godot Complete Skill Suite v2

## Recommended install

Unzip this archive directly into your skills folder so each skill is a first-class sibling:

```bash
unzip godot-complete-skill-suite-v2.zip -d ~/.codex/skills/
```

Recommended result:

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

## Why sibling folders?

Use sibling folders for the actual installation. It keeps each skill discoverable and independently updatable. The Godot pipeline skill is the orchestrator; it references worker skills rather than hiding them.

## When to use a nested kit

A nested kit is useful for sharing one self-contained folder or documenting an umbrella workflow. For day-to-day work, install skills as siblings.

## Personal style packs

Project-specific style packs are opt-in. Keep them local until they are generic
enough to publish, then add them to `suite_manifest.json`.
