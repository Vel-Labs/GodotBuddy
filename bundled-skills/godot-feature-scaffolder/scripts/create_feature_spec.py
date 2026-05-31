#!/usr/bin/env python3
import argparse, json
from pathlib import Path

def slug(s):
    return ''.join(ch.lower() if ch.isalnum() else '_' for ch in s).strip('_') or 'feature'

def main():
    p = argparse.ArgumentParser(description='Create a Godot feature spec folder.')
    p.add_argument('--project-dir', required=True)
    p.add_argument('--feature-name', required=True)
    p.add_argument('--kind', default='gameplay')
    p.add_argument('--summary', default='')
    p.add_argument('--assets', nargs='*', default=[])
    p.add_argument('--ui', nargs='*', default=[])
    args = p.parse_args()

    project = Path(args.project_dir)
    fslug = slug(args.feature_name)
    out = project / 'design' / 'features' / fslug
    out.mkdir(parents=True, exist_ok=True)
    spec = {
        'feature_name': args.feature_name,
        'feature_slug': fslug,
        'kind': args.kind,
        'summary': args.summary,
        'assets_needed': args.assets,
        'ui_needed': args.ui,
        'scenes': [],
        'scripts': [],
        'mobile_notes': ['Touch-first interaction must be supported.'],
        'desktop_notes': ['Mouse/keyboard compatibility should be considered.']
    }
    (out / 'feature_spec.json').write_text(json.dumps(spec, indent=2))
    (out / 'asset_requests.json').write_text(json.dumps({'assets': [{'name': a, 'status': 'needed'} for a in args.assets]}, indent=2))
    (out / 'tasks.md').write_text(f'''# Tasks: {args.feature_name}\n\n- [ ] Confirm feature goal\n- [ ] Define scene nodes\n- [ ] Define scripts/classes\n- [ ] Request/generate assets\n- [ ] Implement first playable version\n- [ ] Test touch input\n- [ ] Test mouse/keyboard path\n- [ ] Optimize assets\n''')
    (out / 'acceptance_criteria.md').write_text(f'''# Acceptance Criteria: {args.feature_name}\n\n- [ ] Feature works on mobile touch input.\n- [ ] Feature works with mouse input on desktop.\n- [ ] Required assets are present and named in manifests.\n- [ ] No obvious performance issue from oversized textures or excessive overdraw.\n''')
    (out / 'scene_plan.md').write_text('# Scene Plan\n\nDefine scenes here.\n')
    (out / 'script_plan.md').write_text('# Script Plan\n\nDefine scripts/classes here.\n')
    print(out)

if __name__ == '__main__':
    main()
