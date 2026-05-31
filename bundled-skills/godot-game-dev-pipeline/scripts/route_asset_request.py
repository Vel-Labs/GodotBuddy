#!/usr/bin/env python3
import argparse, json
from pathlib import Path

def route_for(asset):
    category = asset.get('category', '')
    if category in {'character','prop','furniture','room','map','ui','icon'}:
        return 'sprite-generator'
    return 'godot-feature-scaffolder'

def main():
    p = argparse.ArgumentParser(description='Create routing instructions for one asset request.')
    p.add_argument('--run-dir', required=True)
    p.add_argument('--asset-name', required=True)
    args = p.parse_args()

    run = Path(args.run_dir)
    data = json.loads((run / 'asset-manifest.json').read_text())
    matches = [a for a in data.get('assets', []) if a.get('asset_name') == args.asset_name]
    if not matches:
        raise SystemExit(f'No asset named {args.asset_name!r} found')
    asset = matches[-1]
    skill = route_for(asset)
    handoff = {
        'asset': asset,
        'target_skill': skill,
        'suggested_skills_path': '${CODEX_HOME:-$HOME/.codex}/skills/' + skill,
        'suggested_next_step': 'Use the target skill to prepare/generate this asset, then import with godot-sprite-importer.'
    }
    handoff_dir = run / 'handoffs'
    handoff_dir.mkdir(parents=True, exist_ok=True)
    out = handoff_dir / (args.asset_name + '_handoff.json')
    out.write_text(json.dumps(handoff, indent=2))

    route_path = run / 'route-plan.json'
    route_plan = json.loads(route_path.read_text()) if route_path.exists() else {'routes': []}
    route_plan.setdefault('routes', []).append({'asset_name': args.asset_name, 'target_skill': skill, 'handoff': str(out)})
    route_path.write_text(json.dumps(route_plan, indent=2))
    print(json.dumps(handoff, indent=2))

if __name__ == '__main__':
    main()
