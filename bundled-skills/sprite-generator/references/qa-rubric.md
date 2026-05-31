# QA Rubric

## Geometry

- Final frames match the requested cell size.
- Atlas dimensions equal `columns * cell_width` by `row_count * cell_height`.
- Every used cell is non-empty.
- No sprite is clipped by the cell edge.
- Unused atlas cells are transparent.

## Style and Identity

- Same asset identity across base, states, variants, and animations.
- Same style as the supplied reference or style description.
- Same camera angle/perspective unless a different direction is explicitly requested.
- Same material rendering and edge treatment.
- No accidental redesigns.

## Transparency

- Chroma key is fully removed.
- Chroma key does not remove intended green/magenta/blue asset parts.
- No white rectangles, checkerboards, guide marks, labels, or frame numbers.
- No unwanted cast shadows, glows, dust, or motion trails.

## Animation

- Exact frame count.
- Poses are real animation variants, not the same frame repeated.
- Loops do not visibly pop unless the action is intentionally one-shot.
- Directional rows face the correct direction.

## Godot

- Animation names in `godot_import_manifest.json` are stable.
- `.tres` texture path matches the chosen project destination or has been updated.
- Contact sheet has been reviewed before importing.
