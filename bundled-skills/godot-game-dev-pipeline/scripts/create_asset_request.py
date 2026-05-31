#!/usr/bin/env python3
import argparse, json
from pathlib import Path

def parse_cell(s):
    try:
        w, h = s.lower().split('x')
        return [int(w), int(h)]
    except Exception as exc:
        raise SystemExit('--cell-size must look like 256x256') from exc

def main():
    p = argparse.ArgumentParser(description='Add an asset request to a Godot pipeline run.')
    p.add_argument('--run-dir', required=True)
    p.add_argument('--asset-name', required=True)
    p.add_argument('--category', required=True)
    p.add_argument('--style-pack', default=None)
    p.add_argument('--states', nargs='*', default=[])
    p.add_argument('--animations', nargs='*', default=[])
    p.add_argument('--variations', nargs='*', default=[])
    p.add_argument('--node-type', default='Sprite2D')
    p.add_argument('--cell-size', default='256x256')
    p.add_argument('--notes', default='')
    args = p.parse_args()

    run = Path(args.run_dir)
    req = json.loads((run / 'request.json').read_text()) if (run / 'request.json').exists() else {}
    style_pack = args.style_pack or req.get('style_pack', 'generic')
    asset = {
        'asset_name': args.asset_name,
        'category': args.category,
        'style_pack': style_pack,
        'states': args.states,
        'animations': args.animations,
        'variations': args.variations,
        'notes': args.notes,
        'godot': {
            'node_type': args.node_type,
            'cell_size': parse_cell(args.cell_size),
            'atlas': True,
            'separate_pngs': True
        }
    }
    path = run / 'asset-manifest.json'
    data = json.loads(path.read_text()) if path.exists() else {'assets': []}
    data.setdefault('assets', []).append(asset)
    path.write_text(json.dumps(data, indent=2))
    print(json.dumps(asset, indent=2))

if __name__ == '__main__':
    main()
