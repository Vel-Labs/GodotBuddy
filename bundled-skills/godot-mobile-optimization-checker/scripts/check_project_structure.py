#!/usr/bin/env python3
import argparse, json
from pathlib import Path

EXPECTED = ['project.godot', 'scenes', 'scripts', 'assets', 'design']

def main():
    p = argparse.ArgumentParser(description='Check basic Godot project structure.')
    p.add_argument('--project-dir', required=True)
    args = p.parse_args()
    root = Path(args.project_dir)
    rows = [{'path': e, 'exists': (root / e).exists()} for e in EXPECTED]
    print(json.dumps({'project_dir': str(root), 'checks': rows}, indent=2))

if __name__ == '__main__':
    main()
