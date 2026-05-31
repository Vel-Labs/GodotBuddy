---
name: godot-mobile-optimization-checker
description: Audit Godot projects and generated asset packs for mobile-first performance issues, including large textures, transparent padding waste, asset counts, file sizes, folder hygiene, and desktop compatibility notes. Use before integration, milestone review, or export.
---

# Godot Mobile Optimization Checker

## Purpose

Review assets and project structure for mobile-first Godot development.

## Checks

- image dimensions
- file sizes
- transparent padding waste where possible
- possible oversized textures
- huge atlases
- missing manifests
- mobile/desktop notes

## Workflow

```bash
SKILL_DIR="${CODEX_HOME:-$HOME/.codex}/skills/godot-mobile-optimization-checker"
python "$SKILL_DIR/scripts/audit_assets.py" \
  --project-dir /absolute/path/to/godot_project \
  --output-dir /absolute/path/to/report
```
