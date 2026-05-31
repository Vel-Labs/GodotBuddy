---
name: godot-export-packager
description: Prepare Godot export readiness materials, release checklists, build folders, export preset examples, version manifests, and post-build QA notes for mobile-first and desktop-capable games. Use when a project is nearing test build or release packaging.
---

# Godot Export Packager

## Purpose

Prepare a project for test builds and releases. This skill does not run Godot itself unless explicitly integrated into the user's environment. It creates checklists, release manifests, and export preset examples.

## Workflow

```bash
SKILL_DIR="${CODEX_HOME:-$HOME/.codex}/skills/godot-export-packager"
python "$SKILL_DIR/scripts/create_export_readiness_pack.py" \
  --project-dir /absolute/path/to/godot_project \
  --version 0.1.0 \
  --targets android ios windows macos linux
```

## Outputs

```text
exports/release_0_1_0/
  release_manifest.json
  export_checklist.md
  export_presets.example.cfg
  qa_matrix.md
```
