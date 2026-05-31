---
name: godot-game-dev-pipeline
description: Orchestrate a complete Godot game-development workflow for mobile-first, desktop-capable 2D projects. Use for game planning, feature decomposition, asset routing, Godot integration contracts, scene architecture, QA, optimization, and export readiness. Coordinates sibling skills such as sprite-generator, godot-project-scaffolder, godot-feature-scaffolder, godot-scene-builder, godot-ui-kit-generator, godot-sprite-importer, godot-mobile-optimization-checker, and godot-export-packager.
---

# Godot Game Dev Pipeline

## Purpose

This is the top-level orchestration skill for a Godot game-development pipeline. Use it when the user wants to build, structure, or extend a Godot game and needs a reusable workflow instead of one-off advice.

The pipeline is designed for mobile-first games that also play well on desktop/laptop. It prioritizes practical Godot integration, not just ideation.

## What This Skill Owns

- translating game ideas into structured Godot-ready plans
- choosing which specialized skill handles each part
- creating feature-level manifests and run folders
- defining asset requirements before visual generation
- enforcing mobile-aware budgets and desktop compatibility
- validating that generated assets are ready for Godot
- coordinating scene, UI, sprite, optimization, and export work

## What This Skill Does Not Own

Do not use this top-level skill to hand-generate detailed sprite art directly. Route visual generation into the appropriate sibling sprite skill.

Do not bury implementation details only in chat. Create files, manifests, scripts, or checklists when the user is asking for reusable setup.

## Recommended Skill Foldering

Use sibling skill folders for the actual installation:

```text
${CODEX_HOME:-$HOME/.codex}/skills/
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

Sibling folders are better for day-to-day use because each skill is discoverable and independently updatable.

## Routing Rules

| Request | Route to |
|---|---|
| New Godot project skeleton | `godot-project-scaffolder` |
| Gameplay feature breakdown | `godot-feature-scaffolder` |
| Scene hierarchy or `.tscn` starter | `godot-scene-builder` |
| HUD, menus, mobile UI, icons | `godot-ui-kit-generator` |
| Generic sprites, props, characters, maps | `sprite-generator` |
| Generated sprite pack import | `godot-sprite-importer` |
| Mobile performance and asset audit | `godot-mobile-optimization-checker` |
| Export checklist and release package | `godot-export-packager` |

## Visible Progress Checklist

For multi-step work, keep this checklist visible:

1. Understand the game goal.
2. Create the Godot-ready feature plan.
3. Route project, scene, UI, sprite, or export work to worker skills.
4. Package generated outputs into a Godot integration structure.
5. Review mobile and desktop readiness.

Only mark a step complete when the file, manifest, decision, or generated asset actually exists.

## Default Platform Assumptions

Unless overridden:

- Godot 4.x style project organization
- 2D game
- mobile first, desktop/laptop second
- transparent PNG/WebP and atlases for art output
- touch-first controls with mouse compatibility
- reusable `Node2D`, `Control`, `CharacterBody2D`, `Area2D`, `Sprite2D`, and `AnimatedSprite2D` scenes

## Standard Pipeline Workflow

### 1. Create a pipeline run

```bash
SKILL_DIR="${CODEX_HOME:-$HOME/.codex}/skills/godot-game-dev-pipeline"
python "$SKILL_DIR/scripts/prepare_godot_pipeline.py" \
  --project-name "starter_adventure" \
  --feature-name "first_playable" \
  --style-pack pixel_readable \
  --output-dir /absolute/path/to/run \
  --force
```

### 2. Check sibling skill availability

```bash
python "$SKILL_DIR/scripts/check_skill_links.py" \
  --skills-root "${CODEX_HOME:-$HOME/.codex}/skills"
```

### 3. Add an asset request

```bash
python "$SKILL_DIR/scripts/create_asset_request.py" \
  --run-dir /absolute/path/to/run \
  --asset-name player \
  --category character \
  --style-pack pixel_readable \
  --animations idle walk \
  --cell-size 256x256
```

### 4. Route the asset request

```bash
python "$SKILL_DIR/scripts/route_asset_request.py" \
  --run-dir /absolute/path/to/run \
  --asset-name couch
```

### 5. Import or package results

After a sprite skill has generated art, use `godot-sprite-importer` to create import manifests and starter Godot resources.

### 6. Audit and export

Use `godot-mobile-optimization-checker` and `godot-export-packager` before release.

## Output Structure For Pipeline Runs

```text
run/
  request.json
  asset-manifest.json
  route-plan.json
  prompts/
  references/
  generated/
  godot/
  qa/
  handoffs/
```

## Mobile-First Rules

- Favor clear silhouettes over tiny decorative detail.
- Avoid large unused transparent margins.
- Keep props readable at phone size.
- Use atlases for related sprite families.
- Keep animations short unless they are core to the experience.
- Use touch targets large enough to tap comfortably.
- Make desktop controls additive, not a separate design.

## Style Pack Policy

Keep generic sprite generation and game-specific art styles separate. Project-specific style packs should be created locally through GodotBuddy personalization and promoted only when they are intentionally shareable. Future games can add local siblings such as:

```text
space-diner-sprite-generator/
monster-garden-sprite-generator/
farm-life-sprite-generator/
```

The pipeline keeps style notes in manifests and routes visual work through `sprite-generator` unless a project has intentionally installed a specialized local style worker.

## Delivery Standard

A successful run should leave the user with one or more of these:

- a created project scaffold
- a feature plan and asset manifest
- a routed sprite request
- a Godot-ready import bundle
- an optimization report
- an export/release package
