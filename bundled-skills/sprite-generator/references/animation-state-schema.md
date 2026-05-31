# Animation and State Schema

`prepare_sprite_run.py` writes `asset_request.json`. Advanced users can provide their own config with this shape:

```json
{
  "asset_name": "Player",
  "slug": "player",
  "asset_type": "character",
  "description": "friendly player character with a clear silhouette",
  "style_notes": "match supplied game art reference",
  "references": ["/absolute/path/to/reference.png"],
  "outputs": [
    {
      "id": "idle",
      "kind": "animation",
      "frame_count": 4,
      "description": "gentle breathing and blink",
      "layout": "strip-h",
      "loop": true,
      "fps": 5,
      "anchor": "bottom"
    }
  ],
  "atlas": {
    "cell_width": 256,
    "cell_height": 320,
    "columns": 6,
    "padding": 12,
    "background": "chroma",
    "chroma_key": "#00ff00",
    "chroma_tolerance": 42
  },
  "godot": {
    "texture_path": "res://assets/sprites/player/spritesheet.png"
  }
}
```

## Output fields

- `id`: stable lowercase name used for filenames and Godot animation names.
- `kind`: `animation`, `state`, `variant`, `sprite`, or `map`.
- `frame_count`: number of frames expected from the generated source.
- `description`: action/state prompt text.
- `layout`: `single`, `strip-h`, `strip-v`, or `grid`.
- `loop`: whether Godot should loop the animation.
- `fps`: starter playback speed for Godot.
- `anchor`: `center`, `bottom`, or `top` when fitting into cells.

## CLI shorthand

`--animation idle:4:"gentle breathing":strip-h:loop`

`--state dirty:1:"messy version of same object":single:once`
