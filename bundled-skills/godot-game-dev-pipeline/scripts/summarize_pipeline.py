#!/usr/bin/env python3
import argparse, json
from pathlib import Path

def main():
    p = argparse.ArgumentParser(description='Summarize a pipeline run.')
    p.add_argument('--run-dir', required=True)
    args = p.parse_args()
    run = Path(args.run_dir)
    req = json.loads((run / 'request.json').read_text()) if (run / 'request.json').exists() else {}
    assets = json.loads((run / 'asset-manifest.json').read_text()).get('assets', []) if (run / 'asset-manifest.json').exists() else []
    routes = json.loads((run / 'route-plan.json').read_text()).get('routes', []) if (run / 'route-plan.json').exists() else []
    print(f"Project: {req.get('project_name')}")
    print(f"Feature: {req.get('feature_name')}")
    print(f"Style pack: {req.get('style_pack')}")
    print(f"Assets: {len(assets)}")
    for a in assets:
        print(f"- {a.get('asset_name')} ({a.get('category')}) states={a.get('states')} animations={a.get('animations')}")
    print(f"Routes: {len(routes)}")
    for r in routes:
        print(f"- {r.get('asset_name')} -> {r.get('target_skill')}")

if __name__ == '__main__':
    main()
