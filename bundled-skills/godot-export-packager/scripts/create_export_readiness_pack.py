#!/usr/bin/env python3
import argparse, json
from pathlib import Path

def safe_version(v):
    return v.replace('.', '_').replace('-', '_')

def main():
    p = argparse.ArgumentParser(description='Create an export readiness pack.')
    p.add_argument('--project-dir', required=True)
    p.add_argument('--version', required=True)
    p.add_argument('--targets', nargs='*', default=['android','ios','windows','macos','linux'])
    args = p.parse_args()

    project = Path(args.project_dir)
    out = project / 'exports' / ('release_' + safe_version(args.version))
    out.mkdir(parents=True, exist_ok=True)
    manifest = {
        'version': args.version,
        'targets': args.targets,
        'project_dir': str(project),
        'status': 'readiness_pack_created'
    }
    (out / 'release_manifest.json').write_text(json.dumps(manifest, indent=2))
    checklist = ['# Export Checklist', '']
    for item in [
        'Project opens without missing resources',
        'Main scene set correctly',
        'Mobile touch controls tested',
        'Desktop mouse/keyboard tested',
        'Asset audit reviewed',
        'Icons and splash screens prepared',
        'Debug overlays removed',
        'Save/load tested',
        'Audio settings reviewed'
    ]:
        checklist.append(f'- [ ] {item}')
    (out / 'export_checklist.md').write_text('\n'.join(checklist) + '\n')
    matrix = ['# QA Matrix', '']
    for t in args.targets:
        matrix.append(f'## {t}')
        matrix.append('- [ ] Launches')
        matrix.append('- [ ] Input works')
        matrix.append('- [ ] Layout/aspect ratio okay')
        matrix.append('- [ ] Performance acceptable')
        matrix.append('')
    (out / 'qa_matrix.md').write_text('\n'.join(matrix))
    presets = ['; Example export presets. Copy into export_presets.cfg and edit in Godot as needed.', '']
    platform_map = {'android':'Android','ios':'iOS','windows':'Windows Desktop','macos':'macOS','linux':'Linux/X11'}
    for i, t in enumerate(args.targets):
        presets.append(f'[preset.{i}]')
        presets.append(f'name="{t}"')
        presets.append(f'platform="{platform_map.get(t, t)}"')
        presets.append('runnable=true')
        presets.append('')
    (out / 'export_presets.example.cfg').write_text('\n'.join(presets))
    print(out)

if __name__ == '__main__':
    main()
