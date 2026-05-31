# Local Board Spec

The local board reads from `.godotbuddy/runs/<slug>/state.json`.

## Sections

- Goal / oracle
- Pipeline board
- Asset wall
- Receipts / proof
- Future: import queue, performance warnings, scene graph, animation preview

## Source of truth

The board should not become a separate database. It is a view over repo-owned JSON files, so the run can pause, resume, branch, and be inspected by agents.
