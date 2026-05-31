# Agent Workflow

Suggested multi-agent model:

```text
Intent -> Scout -> Producer/Judge -> Worker -> Proof
```

## Agents

- `godot_scout`: maps the repo, project structure, assets, and blockers.
- `godot_producer`: chooses the largest safe useful slice and keeps the board honest.
- `godot_asset_director`: routes asset requests into sprite-generation skills and validates outputs.
- `godot_engineer`: implements scenes, scripts, imports, and project changes.
- `godot_qa`: verifies mobile/desktop readiness and records proof.

## Rule

Every meaningful task should leave a receipt: generated asset, screenshot, manifest, test result, Godot scene path, import note, or human decision.
