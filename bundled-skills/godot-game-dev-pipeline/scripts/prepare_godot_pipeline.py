#!/usr/bin/env python3
import argparse, json, shutil
from pathlib import Path

def slug(s: str) -> str:
    return ''.join(ch.lower() if ch.isalnum() else '_' for ch in s).strip('_') or 'project'

def main():
    p = argparse.ArgumentParser(description='Prepare a Godot pipeline run folder.')
    p.add_argument('--project-name', required=True)
    p.add_argument('--feature-name', required=True)
    p.add_argument('--style-pack', default='generic')
    p.add_argument('--game-type', default='2d-mobile-desktop')
    p.add_argument('--output-dir', required=True)
    p.add_argument('--force', action='store_true')
    args = p.parse_args()

    out = Path(args.output_dir)
    if out.exists() and args.force:
        shutil.rmtree(out)
    out.mkdir(parents=True, exist_ok=True)
    for rel in ['prompts','references','generated','godot','qa','handoffs','feature-specs']:
        (out / rel).mkdir(parents=True, exist_ok=True)

    recommended = 'sprite-generator'
    request = {
        'project_name': args.project_name,
        'project_slug': slug(args.project_name),
        'feature_name': args.feature_name,
        'feature_slug': slug(args.feature_name),
        'style_pack': args.style_pack,
        'game_type': args.game_type,
        'platform_focus': ['mobile','desktop'],
        'recommended_sprite_skill': recommended,
        'created_by': 'godot-game-dev-pipeline'
    }
    (out / 'request.json').write_text(json.dumps(request, indent=2))
    (out / 'asset-manifest.json').write_text(json.dumps({'assets': []}, indent=2))
    (out / 'route-plan.json').write_text(json.dumps({'routes': []}, indent=2))
    (out / 'qa/mobile_desktop_readiness.md').write_text('# Mobile/Desktop Readiness\n\n- [ ] Touch controls considered\n- [ ] Mouse controls considered\n- [ ] Texture sizes reviewed\n- [ ] UI readable on phone\n- [ ] Assets have manifests\n')
    (out / 'RUN_NOTES.md').write_text(f'''# {args.project_name} / {args.feature_name}\n\nStyle pack: `{args.style_pack}`\nRecommended sprite skill: `{recommended}`\n\nNext:\n\n1. Add asset requests with `create_asset_request.py`.\n2. Route requests with `route_asset_request.py`.\n3. Generate/ingest assets with the selected worker skill.\n4. Import generated assets with `godot-sprite-importer`.\n5. Audit with `godot-mobile-optimization-checker`.\n''')
    print(out)

if __name__ == '__main__':
    main()
