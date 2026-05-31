import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import {
  addAsset,
  addMoodboardReference,
  composeMoodboardContext,
  configPath,
  createRun,
  doctor,
  loadMoodboard,
  packageRoot,
  personalizeStylePack,
  promoteStylePack,
  qaSpriteAssets,
  quickstartProject,
  readJson,
  setupFirstRun
} from '../src/core.mjs';

test('setupFirstRun personalizes workspace, installs skills, and records a receipt', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'godotbuddy-setup-'));
  const root = path.join(tmp, 'game');
  const codexHome = path.join(tmp, 'codex-home');

  const result = setupFirstRun({
    root,
    projectName: 'My Godot Game',
    platforms: ['mobile'],
    codexHome,
    installSkills: true
  });

  assert.equal(result.config.project_name, 'My Godot Game');
  assert.equal(result.config.default_style_pack, 'generic');
  assert.deepEqual(result.config.platform_focus, ['mobile']);
  assert.equal(result.config.personalization.style_pack, 'generic');
  assert.equal(result.config.skills.install_mode, 'bundled');
  assert.equal(result.installedSkills.length, 9);

  const installedSkill = path.join(codexHome, 'skills', 'godot-game-dev-pipeline', 'SKILL.md');
  assert.ok(fs.existsSync(installedSkill));
  assert.ok(!fs.existsSync(path.join(codexHome, 'skills', 'personal-style-sprite-generator')));

  const config = readJson(configPath(root));
  assert.equal(config.project_name, 'My Godot Game');
  assert.ok(config.skills.installed_at);
  assert.equal(config.skills.installed.length, 9);

  const receipt = path.join(root, '.godotbuddy', 'receipts', 'first-run-setup.md');
  assert.ok(fs.existsSync(receipt));
  assert.match(fs.readFileSync(receipt, 'utf8'), /Installed bundled skills/);

  const manifest = readJson(path.join(root, '.godotbuddy', 'install-manifest.json'));
  assert.equal(manifest.project_name, 'My Godot Game');
  assert.equal(manifest.installed_skills.length, 9);
  assert.equal(manifest.commands.setup.command, 'setup');
});

test('quickstart creates a guided first run with next-step tasks', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'godotbuddy-quickstart-'));
  const root = path.join(tmp, 'game');
  const codexHome = path.join(tmp, 'codex-home');

  const result = quickstartProject({
    root,
    projectName: 'Friendly Game',
    goal: 'Build a readable first playable scene',
    codexHome
  });

  assert.equal(result.state.title, 'Build a readable first playable scene');
  assert.ok(result.state.tasks.some(task => task.title === 'Personalize the visual style'));
  assert.ok(result.state.tasks.some(task => task.title === 'Run sprite and import QA'));
  assert.ok(fs.existsSync(path.join(root, '.godotbuddy', 'install-manifest.json')));
});

test('doctor checks install health without requiring optional Godot files', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'godotbuddy-doctor-'));
  const root = path.join(tmp, 'game');
  const codexHome = path.join(tmp, 'codex-home');

  quickstartProject({
    root,
    projectName: 'Doctor Game',
    goal: 'Verify install health',
    codexHome
  });

  const checks = doctor({ root });
  const byName = new Map(checks.map(check => [check.name, check]));

  assert.equal(byName.get('Node version >= 18').ok, true);
  assert.equal(byName.get('Install manifest readable').ok, true);
  assert.equal(byName.get('Config readable').ok, true);
  assert.equal(byName.get('Hub file readable').ok, true);
  assert.equal(byName.get('Active run state readable').ok, true);
  assert.equal(byName.get('Moodboard readable').ok, true);
  assert.equal(byName.get('Board web app files').ok, true);
  assert.equal(byName.get('Bundled generic skills').ok, true);
  assert.equal(byName.get('Installed GodotBuddy skills').ok, true);
  assert.equal(byName.get('Godot project file').level, 'optional');
  assert.equal(byName.get('Godot editor addon installed').level, 'optional');
});

test('personalizeStylePack creates a local style pack from answers and reference files', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'godotbuddy-style-'));
  const root = path.join(tmp, 'game');
  const reference = path.join(tmp, 'reference.png');
  fs.writeFileSync(reference, 'not-a-real-png-but-a-reference-file');

  setupFirstRun({ root, projectName: 'Style Game', codexHome: path.join(tmp, 'codex'), installSkills: false });
  const result = personalizeStylePack({
    root,
    name: 'Soft Forest',
    description: 'Warm readable sprites for a forest game.',
    artStyle: 'storybook',
    spriteScale: '64x64',
    references: [reference]
  });

  assert.equal(result.slug, 'soft-forest');
  assert.ok(fs.existsSync(path.join(result.dir, 'style-pack.json')));
  assert.ok(fs.existsSync(path.join(result.dir, 'SKILL.md')));
  assert.ok(fs.existsSync(path.join(result.dir, 'references', 'reference.png')));

  const cfg = readJson(configPath(root));
  assert.equal(cfg.default_style_pack, 'soft-forest');
  assert.ok(cfg.personalization.style_packs.some(pack => pack.slug === 'soft-forest'));
});

test('moodboard references keep notes and feed asset request context', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'godotbuddy-moodboard-'));
  const root = path.join(tmp, 'game');
  const reference = path.join(tmp, 'palette.png');
  fs.writeFileSync(reference, 'reference image bytes');
  const state = createRun({ root, title: 'Moodboard run', goal: 'Use visual references', force: true });

  const ref = addMoodboardReference({
    root,
    file: reference,
    title: 'Warm palette',
    notes: 'Use this for garden lighting and soft UI color.',
    tags: ['palette', 'lighting'],
    useFor: 'palette, lighting',
    avoid: 'muddy low contrast sprites',
    weight: 4
  });

  assert.equal(ref.title, 'Warm palette');
  assert.equal(ref.weight, 4);
  assert.ok(fs.existsSync(path.join(root, ref.path)));

  const moodboard = loadMoodboard(root);
  assert.equal(moodboard.references.length, 1);
  assert.match(composeMoodboardContext(root), /Warm palette/);
  assert.match(composeMoodboardContext(root), /muddy low contrast/);

  const asset = addAsset({ root, slug: state.slug, name: 'player', type: 'character', style: 'generic' });
  const request = readJson(path.join(root, '.godotbuddy', 'runs', state.slug, asset.manifest));
  assert.match(request.moodboard_context, /Warm palette/);
  assert.equal(request.moodboard_references[0].title, 'Warm palette');
});

test('qaSpriteAssets writes a report and receipt for sprite readiness', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'godotbuddy-qa-'));
  const root = path.join(tmp, 'game');
  const state = createRun({ root, title: 'QA run', goal: 'Check sprites', force: true });
  addAsset({ root, slug: state.slug, name: 'player', type: 'character', animations: ['idle'], style: 'generic' });

  const result = qaSpriteAssets({ root, slug: state.slug });

  assert.equal(result.status, 'needs_attention');
  assert.ok(result.findings.some(finding => finding.asset === 'player'));
  assert.ok(fs.existsSync(result.reportPath));
  assert.match(fs.readFileSync(result.reportPath, 'utf8'), /player/);
});

test('promoteStylePack copies a local pack to a shareable folder intentionally', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'godotbuddy-promote-'));
  const root = path.join(tmp, 'game');
  setupFirstRun({ root, projectName: 'Promote Game', codexHome: path.join(tmp, 'codex'), installSkills: false });
  personalizeStylePack({
    root,
    name: 'Arcade Bright',
    description: 'Sharp readable arcade sprites.',
    artStyle: 'arcade',
    spriteScale: '32x32'
  });

  const promoted = promoteStylePack({ root, slug: 'arcade-bright' });

  assert.ok(fs.existsSync(path.join(promoted.dest, 'SKILL.md')));
  assert.ok(fs.existsSync(path.join(promoted.dest, 'style-pack.json')));
  assert.match(promoted.dest, /godotbuddy-style-packs/);
});

test('package allowlist excludes local GodotBuddy usage state', () => {
  const pkg = readJson(path.join(packageRoot(), 'package.json'));

  assert.ok(Array.isArray(pkg.files));
  assert.ok(pkg.files.includes('bin/'));
  assert.ok(pkg.files.includes('bundled-skills/godot-game-dev-pipeline/SKILL.md'));
  assert.ok(!pkg.files.includes('bundled-skills/'));
  assert.ok(!pkg.files.includes('bundled-skills/godot-game-dev-pipeline/'));
  assert.ok(!pkg.files.includes('bundled-skills/personal-style-sprite-generator/'));
  assert.ok(!pkg.files.includes('examples/'));
  assert.ok(!pkg.files.includes('examples/sample-assets/'));
  assert.ok(!pkg.files.includes('.godotbuddy/'));
  assert.ok(!pkg.files.includes('godotbuddy-demo/'));
});
