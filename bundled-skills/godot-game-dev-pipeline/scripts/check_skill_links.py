#!/usr/bin/env python3
import argparse, json
from pathlib import Path

REQUIRED = [
    'godot-project-scaffolder',
    'godot-feature-scaffolder',
    'godot-scene-builder',
    'godot-ui-kit-generator',
    'godot-sprite-importer',
    'godot-mobile-optimization-checker',
    'godot-export-packager',
    'sprite-generator'
]

def main():
    p = argparse.ArgumentParser(description='Check expected sibling skills exist.')
    p.add_argument('--skills-root', default=str(Path.home() / '.codex' / 'skills'))
    args = p.parse_args()
    root = Path(args.skills_root)
    rows = []
    for name in REQUIRED:
        path = root / name
        rows.append({'skill': name, 'exists': path.exists(), 'path': str(path)})
    print(json.dumps({'skills_root': str(root), 'skills': rows}, indent=2))
    missing = [r['skill'] for r in rows if not r['exists']]
    if missing:
        raise SystemExit('Missing skills: ' + ', '.join(missing))

if __name__ == '__main__':
    main()
