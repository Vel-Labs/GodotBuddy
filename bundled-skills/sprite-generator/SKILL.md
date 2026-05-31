---
name: sprite-generator
description: Create, repair, validate, preview, and package game-ready sprite assets for Godot from references or vivid descriptions. Use when a user wants a character, prop, furniture state set, animation strip, map, dollhouse room, UI-adjacent game object, style-matched variations, or a Godot-ready atlas with SpriteFrames resources. This skill delegates actual art generation to the installed image generation skill/tool and uses bundled scripts only for deterministic prompt planning, chroma-key cleanup, frame extraction, atlas composition, QA, previews, and Godot packaging.
---

# Sprite Generator

## Overview

Create production-oriented 2D game sprites from a concept, one or more reference images, or a detailed art-direction brief. The skill is intentionally style-agnostic: the user can provide a reference image, a style card, a screenshot, or a vivid description, and the workflow turns that into a reusable sprite-generation run with prompts, grounding images, a generated base reference, animation/state jobs, deterministic extraction, QA, and Godot starter files.

The goal is not merely to make a pretty image. The goal is to produce assets that can be placed in a Godot project with predictable filenames, transparent backgrounds, clean atlases, frame metadata, QA contact sheets, and `SpriteFrames` starter resources.

Use this skill for requests like:

- "Create furniture for a house with clean and dirty versions."
- "Make a character in this art style with idle, walking, pointing, and cleaning animations."
- "Create a dollhouse room map in the same style as this reference."
- "Generate alternate outfits/color variants and keep the same body proportions."
- "Turn this object sketch into a game-ready transparent prop sprite."

## Input Model

Accept any combination of these inputs:

- **Reference images:** style sheet, existing character, prop, screenshot, mood board, palette, previous generated sprite, or in-game capture.
- **Vivid description:** asset name, role, shape, material, color, scale, camera angle, intended use, and style adjectives.
- **Asset type:** `character`, `npc`, `player`, `furniture`, `prop`, `object`, `map`, `room`, `dollhouse`, or generic `sprite`.
- **Animations:** named actions, frame counts, directions, loop/one-shot behavior, durations or FPS, and special pose notes.
- **States and variants:** clean/dirty, open/closed, healthy/wilted, empty/full, outfit A/B, color set, damage levels, etc.
- **Integration target:** Godot version, cell size, atlas columns, scale, top-down/isometric/side-view camera, and preferred import path.

If the user omits details, infer sane defaults and make the output easy to iterate. Do not block on every missing detail. Ask a clarifying question only when the omission would cause expensive wrong work, such as unknown style, unknown character identity, or a required animation list.

## Visual Generation Delegation

Actual art must be generated with the environment's image-generation capability, not with local scripts. In a Codex-style skill environment, delegate to the installed `$imagegen` skill if available. In ChatGPT, use the native image generation tool when the user asks to actually create the visual asset. The bundled Python scripts are for deterministic production steps only.

Allowed deterministic steps:

- create run folders and prompt files
- copy stable references into the run
- create layout guide images
- record selected generated outputs
- remove a flat chroma-key background
- split strips into frames
- crop, scale, pad, and center frames into consistent cells
- compose PNG/WebP atlases
- generate contact sheets and GIF previews
- write JSON manifests and Godot starter resources

Hard boundary: do not draw, paint, synthesize, tile, warp, or invent the sprite art with Pillow, SVG, CSS, HTML canvas, or programmatic shapes as a substitute for image generation. The scripts can process generated images; they cannot be used as a hidden art generator.

## Style Capture and Style Lock

When a style reference is provided, treat it as the source of truth. Extract these qualities into the prompt plan:

- camera angle and perspective: front, side, top-down, isometric, 3/4, dollhouse, orthographic
- proportions: chibi, realistic, squat, tall, toy-like, pixel, painterly, flat vector, low-poly render
- line and edge treatment: no outline, thick outline, soft rendered edge, pixel edge, cel-shaded border
- materials and lighting: clay, plush, plastic toy, painted 3D, flat cel, glossy, matte, watercolor, etc.
- palette and saturation
- shadow policy: none for transparent sprites unless explicitly retained as part of the object
- background policy: transparent or flat chroma key for extraction
- scale and readability at the target cell size

A row or state fails if it looks like a related asset in a different style rather than the same asset in the target style.

## Asset Type Defaults

### Characters/NPCs/Players

Default outputs if the user does not specify animations:

| Animation | Frames | Purpose |
| --- | ---: | --- |
| `idle` | 4 | breathing/blinking loop; first frame works as static pose |
| `walk_down` | 6 | front/down movement |
| `walk_up` | 6 | back/up movement |
| `walk_left` | 6 | side-view movement facing left |
| `walk_right` | 6 | side-view movement facing right |

Optional common actions: `point`, `talk`, `pickup`, `carry`, `clean`, `use_item`, `sit`, `sleep`, `cry`, `celebrate`, `fail`, `interact`, `attack`, `cast`, `jump`, `push`, `pull`.

### Furniture/Props/Objects

Default outputs if the user does not specify states:

| State | Frames | Purpose |
| --- | ---: | --- |
| `clean` | 1 | normal/tidy state |
| `dirty` | 1 | dirty/messy state of the same object |

Optional common states: `empty`, `half_full`, `full`, `overflowing`, `open`, `closed`, `on`, `off`, `healthy`, `wilted`, `broken`, `repaired`, `selected`, `highlighted`, `locked`, `unlocked`.

### Maps/Rooms/Dollhouses

Default output is one large `map_base` sprite or background. For rooms, specify whether you need a single flattened art layer or separate layers such as `floor`, `walls`, `furniture`, `interactables`, `path_overlay`, and `collision_reference`. Do not include UI labels, arrows, path lines, or tutorial overlays in production map art unless requested as a separate overlay.

## Background and Transparency Rules

Prefer flat chroma-key backgrounds for generation when the image tool does not reliably produce true alpha. Default key is `#00ff00`. The final atlas should be transparent PNG/WebP after extraction.

For generated source images:

- use one flat background color across the whole strip or object render
- keep the asset visually separate from the chroma key
- avoid green highlights/materials when using green key; choose magenta or blue key instead if the asset needs green
- no white background, checkerboard background, UI panel, labels, frame numbers, visible grid, border, or scenery
- no cast shadows, floor shadows, glows, soft transparent halos, dust clouds, speed lines, motion trails, or loose detached effects unless a small attached opaque effect is explicitly part of the sprite
- every frame must be complete, separated, unclipped, and inside its slot

## Animation Prompting Rules

For every animation row/strip:

- request exactly the declared frame count
- specify the layout: usually horizontal strip left-to-right
- use a canonical base image and reference images as grounding inputs
- keep identity, proportions, palette, material, outline/edge style, and camera angle consistent
- communicate motion through pose changes, not through blur, speed lines, dust, or shadows
- first and last frames should loop cleanly when `loop=true`
- for directional animations, request the direction explicitly and avoid accidental mirrored details if the character has side-specific accessories

Do not accept a row if it changes the character's face, body shape, outfit, prop design, material style, or scale relative to the base.

## Visible Progress Plan

For a normal asset run, keep a visible checklist for the user:

1. Preparing the asset request.
2. Creating the canonical look.
3. Creating states and animation rows.
4. Packaging for Godot.

What each step means:

- **Preparing the asset request:** establish asset name, asset type, style source, outputs, cell size, chroma key, and run directory.
- **Creating the canonical look:** generate or choose the base reference that becomes the identity/style lock.
- **Creating states and animation rows:** generate each output job using the base and references; repair only failing rows/states.
- **Packaging for Godot:** extract frames, compose atlas, create QA contact sheet, write manifests, write `SpriteFrames` starter resource, and report file paths.

Only mark a step complete when the real file or decision exists.

## Default Workflow

### 1. Prepare a run folder

```bash
SKILL_DIR="${CODEX_HOME:-$HOME/.codex}/skills/sprite-generator"
python "$SKILL_DIR/scripts/prepare_sprite_run.py"   --asset-name "Market Crate"   --asset-type prop   --description "readable wooden market crate with colorful contents"   --style-notes "match the supplied game art reference"   --reference /absolute/path/to/style_reference.png   --state full:1:"crate full of items":single:once   --state empty:1:"same crate empty":single:once   --cell-size 256x256   --columns 2   --output-dir /absolute/path/to/run   --force
```

For a character:

```bash
python "$SKILL_DIR/scripts/prepare_sprite_run.py"   --asset-name "Player"   --asset-type character   --description "friendly player character with a clear silhouette"   --reference /absolute/path/to/style_reference.png   --animation idle:4:"gentle breathing and blink"   --animation walk_down:6:"walking toward camera"   --animation walk_up:6:"walking away from camera"   --animation walk_left:6:"walking left side view"   --animation walk_right:6:"walking right side view"   --cell-size 256x320   --columns 6   --output-dir /absolute/path/to/run   --force
```

Advanced runs can be described with a JSON config file and passed with `--config`.

### 2. Inspect ready jobs

```bash
python "$SKILL_DIR/scripts/sprite_job_status.py" --run-dir /absolute/path/to/run
```

The `base` job should be generated first. Record the selected generated base image before generating dependent jobs. The recorder writes `references/canonical-base.png`, which subsequent jobs should use as an input image.

### 3. Generate each visual job

For every ready job, use the prompt file listed in `imagegen-jobs.json` plus all listed input images. Select the best original generated image, then record it:

```bash
python "$SKILL_DIR/scripts/record_imagegen_result.py"   --run-dir /absolute/path/to/run   --job-id <job-id>   --source /absolute/path/to/generated-output.png
```

Do not record hand-edited fixtures, thumbnails, or files from the run's final/frames folders as source art. Record the selected original generated output.

### 4. Finalize

```bash
python "$SKILL_DIR/scripts/finalize_sprite_run.py" --run-dir /absolute/path/to/run
```

Expected output:

```text
run/
  asset_request.json
  imagegen-jobs.json
  prompts/
  references/
  decoded/
  frames/frames-manifest.json
  final/spritesheet.png
  final/spritesheet.webp
  final/validation.json
  qa/contact-sheet.png
  qa/previews/*.gif
  qa/run-summary.json
  godot/<asset>_spriteframes.tres
  godot/<asset>_animated_sprite_2d.tscn
  godot/godot_import_manifest.json
  godot/README_GODOT.md
```

### 5. Copy into Godot

```bash
python "$SKILL_DIR/scripts/package_godot_assets.py"   --run-dir /absolute/path/to/run   --project-dir /absolute/path/to/godot-project   --dest assets/sprites
```

Review `godot/README_GODOT.md` after packaging. If you copy files to a different `res://` location, update the texture path inside the generated `.tres` file.

## Repair Workflow

If QA fails, repair the smallest scope first:

1. A single bad state or animation row.
2. A single bad frame only if your image tool supports frame-level editing reliably.
3. The canonical base only if identity/style is wrong everywhere.
4. The full atlas only as a last resort.

Common repair prompts:

- "Regenerate only `walk_left`; preserve the exact canonical character, outfit, proportions, and toy-render style."
- "Regenerate only `dirty`; it must be the same couch as `clean`, but with blanket/pillows messy."
- "Regenerate the strip with exactly 6 frames and no frame numbers or labels."
- "Use magenta chroma key because the object needs green material."

After recording the repair image, rerun finalization.

## QA Rubric

Do not accept an asset until these checks pass:

- The generated base matches the requested style or supplied style references.
- Every state/animation is the same asset identity, not a redesign.
- Exact frame counts are present.
- Transparent extraction does not remove important parts of the sprite.
- Frames are complete, centered, padded, and not clipped.
- No labels, frame numbers, grid lines, watermarks, UI panels, or scenery leaked into the production art.
- No unwanted shadows, glows, dust, speed lines, blur, or detached effects remain after extraction.
- Contact sheet visually reads correctly at target size.
- `final/validation.json` has no errors; warnings have been visually reviewed.
- Godot manifest names match the animation names you intend to call in code.

## Acceptance Criteria

A completed run should include:

- a canonical base reference in `references/canonical-base.png`
- selected generated sources recorded in `imagegen-jobs.json`
- extracted transparent frame PNGs
- `final/spritesheet.png` and, when supported, `final/spritesheet.webp`
- `qa/contact-sheet.png`
- GIF previews for multi-frame animations
- `final/validation.json` with no errors
- Godot starter files under `godot/`
- a short user-facing report naming any rows/states repaired or manually accepted despite warnings

## Rules

- Use visual generation for visuals; use scripts for deterministic processing only.
- Always use a canonical base for multi-output assets.
- Keep references attached for every dependent visual job when the image tool supports references.
- Prefer transparent or chroma-key-compatible output over scene illustrations.
- Do not put UI labels, instructional arrows, path lines, or collision guides into production sprites unless they are requested as separate overlay assets.
- For Godot, keep animation names stable and lowercase with underscores.
- Treat style drift as a blocker even if geometry validation passes.
