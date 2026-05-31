# GodotBuddy Architecture

## Product shape

GodotBuddy should be treated as a local workflow app/plugin, not only a skill pack.

```text
GodotBuddy CLI + local web board
  -> repo workspace: .godotbuddy/
  -> Godot editor addon: addons/godotbuddy/
  -> Codex-style agents: agents/
  -> bundled skills: bundled-skills/
  -> asset pipeline handoffs: requests/ and handoffs/
```

## Layering

### 1. Control plane

The CLI and local web board own run state, status, asset previews, and receipts.

### 2. Worker skills

Sprite-generation and Godot scaffolding skills are worker packs. They can be installed separately, but GodotBuddy should route to them.

### 3. Godot adapter

The Godot adapter creates project folders, addon files, import notes, and starter scene structures.

### 4. Future platform adapters

The core can remain engine-aware but not engine-trapped. Possible future adapters:

- UnityBuddy
- WebGameBuddy
- PhaserBuddy
- UnrealBuddy

The v1 should stay Godot-first because Godot integration details are concrete and valuable.
