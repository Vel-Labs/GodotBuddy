# GodotBuddy vs GameBuddy

## Recommendation

Brand the v1 as **GodotBuddy**.

Reason: the value comes from concrete Godot outputs — scenes, project folders, editor addon, import manifests, sprite sheets, mobile export checks, and Godot-specific QA.

## Keep the architecture expandable

Use a generic internal core:

```text
packages/core       # board, state, assets, receipts
packages/godot      # Godot adapter
packages/assets     # sprite and art pipeline helpers
packages/agents     # agent prompts
```

Then future products can reuse the same core:

```text
GodotBuddy = core + Godot adapter
GameBuddy = core + multiple engine adapters
UnityBuddy = core + Unity adapter
```

Do not over-generalize v1. Godot-first is the stronger product.
