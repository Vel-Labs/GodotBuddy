# Godot Integration Contract

The deterministic finalization step writes:

```text
final/spritesheet.png
final/spritesheet.webp
godot/<slug>_spriteframes.tres
godot/<slug>_animated_sprite_2d.tscn
godot/godot_import_manifest.json
godot/README_GODOT.md
```

The `.tres` file is a Godot 4 starter `SpriteFrames` resource that uses `AtlasTexture` subresources pointing at the generated atlas. It is designed to get you moving quickly, not to replace project-specific import conventions.

Recommended project path:

```text
res://assets/sprites/<slug>/
  spritesheet.png
  <slug>_spriteframes.tres
  <slug>_animated_sprite_2d.tscn
  godot_import_manifest.json
```

Recommended texture import settings:

- Filter: off for pixel or crisp low-res sprites; on for soft 3D-rendered sprites when desired.
- Mipmaps: off for UI sprites; optional for scaled world props.
- Repeat: disabled.
- Alpha: enabled.

Runtime usage:

```gdscript
$AnimatedSprite2D.play("idle")
$AnimatedSprite2D.play("walk_down")
```

For pathing characters, pair the generated `AnimatedSprite2D` with your movement controller and switch animations based on the movement vector.
