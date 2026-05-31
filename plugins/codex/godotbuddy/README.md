# GodotBuddy Codex Plugin Skeleton

This folder provides a GoalBuddy-inspired plugin shape for Codex-style workflows.

The stable entrypoint is the npm/Node CLI:

```bash
godotbuddy prep --goal "..."
godotbuddy board
```

The plugin manifest is intentionally conservative because native plugin schemas may evolve. Use it as the Codex plugin packaging layer around the CLI and the bundled agents.
