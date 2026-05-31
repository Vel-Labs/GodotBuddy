# GodotBuddy Agents

Use the scoped agents in `agents/` rather than generic roles.

Default flow:

```text
Scout maps the project.
Producer chooses the slice.
Asset Director handles art pipeline handoffs.
Engineer integrates into Godot.
QA verifies the oracle and records receipts.
```

Each agent should leave a receipt in the active `.godotbuddy/runs/<slug>/receipts/` folder when it completes meaningful work.
