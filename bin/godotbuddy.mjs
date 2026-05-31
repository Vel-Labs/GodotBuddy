#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import {
  initWorkspace,
  createRun,
  addAsset,
  addTask,
  moveTask,
  attachFile,
  addReceipt,
  scaffoldGodotProject,
  installGodotAddon,
  installBundledSkills,
  setupFirstRun,
  quickstartProject,
  personalizeStylePack,
  qaSpriteAssets,
  promoteStylePack,
  doctor,
  repoRoot,
  loadRun,
  listRuns,
  runDir,
  packageRoot,
  copyRecursive,
  readJson
} from '../src/core.mjs';
import { startServer } from '../src/server.mjs';

function parse(argv) {
  const out = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith('--')) { out._.push(a); continue; }
    const key = a.slice(2);
    const next = argv[i + 1];
    if (next == null || next.startsWith('--')) out[key] = true;
    else { out[key] = next; i++; }
  }
  return out;
}

function csv(v) {
  if (!v) return [];
  if (Array.isArray(v)) return v;
  return String(v).split(',').map(s => s.trim()).filter(Boolean);
}

function bool(v, def = false) {
  if (v == null) return def;
  if (typeof v === 'boolean') return v;
  return !['false','0','no','off'].includes(String(v).toLowerCase());
}

function printHelp() {
  console.log(`GodotBuddy v0.1.0

Usage:
  godotbuddy setup [--project-name NAME] [--style-pack generic] [--platforms mobile,desktop] [--install-skills true]
  godotbuddy quickstart [--project-name NAME] [--goal "..."] [--open true]
  godotbuddy init [--project-name NAME] [--root DIR]
  godotbuddy scaffold [--project NAME] [--root DIR] [--install-addon]
  godotbuddy personalize --name NAME [--description "..."] [--art-style pixel|storybook|painted|custom] [--reference PATH]
  godotbuddy prep --goal "..." [--title NAME] [--style-pack generic]
  godotbuddy asset --name NAME [--type prop] [--states clean,dirty] [--animations idle,walk] [--style generic]
  godotbuddy qa [--run SLUG]
  godotbuddy promote-style-pack --style SLUG [--dest DIR]
  godotbuddy attach --asset ASSET_ID --file PATH [--kind final|source|generated]
  godotbuddy task --title "..." [--lane backlog|scouting|asset_pipeline|godot_integration|qa|done]
  godotbuddy move --task TASK_ID_OR_TITLE --lane done
  godotbuddy receipt --title "..." [--body "..."] [--file PATH]
  godotbuddy board [--run SLUG] [--port 41737] [--open true]
  godotbuddy status [--run SLUG]
  godotbuddy doctor
  godotbuddy install-addon [--project DIR] [--force]
  godotbuddy install-skills [--codex-home DIR] [--force]
  godotbuddy demo [--root DIR] [--open true]

Core idea:
  GodotBuddy keeps a local run board, asset wall, receipts, handoffs, and Godot import notes inside your repo.
`);
}

function openUrl(url) {
  const platform = process.platform;
  const cmd = platform === 'darwin' ? 'open' : platform === 'win32' ? 'cmd' : 'xdg-open';
  const args = platform === 'win32' ? ['/c', 'start', '', url] : [url];
  const child = spawn(cmd, args, { stdio: 'ignore', detached: true });
  child.on('error', () => {});
  child.unref();
}

async function main() {
  const [command = 'help', ...rest] = process.argv.slice(2);
  const args = parse(rest);
  const root = path.resolve(args.root || repoRoot());

  try {
    if (command === 'help' || command === '--help' || command === '-h') return printHelp();

    if (command === 'init') {
      const r = initWorkspace({ root, projectName: args['project-name'] || args.projectName, force: bool(args.force, false) });
      console.log(`Initialized GodotBuddy workspace: ${r.gb}`);
      return;
    }

    if (command === 'setup') {
      const r = setupFirstRun({
        root,
        projectName: args['project-name'] || args.projectName || args.project,
        stylePack: args['style-pack'] || args.style || 'generic',
        platforms: csv(args.platforms || args.platform || 'mobile,desktop'),
        codexHome: args['codex-home'],
        installSkills: bool(args['install-skills'], true),
        includePersonalStylePacks: bool(args['include-personal-style-packs'], false),
        force: bool(args.force, false)
      });
      console.log(`Configured GodotBuddy workspace: ${path.join(r.root, '.godotbuddy')}`);
      console.log(`Personalized project: ${r.config.project_name}`);
      if (bool(args['install-skills'], true)) {
        console.log(r.installedSkills.length ? `Installed ${r.installedSkills.length} bundled skills.` : 'Bundled skills already installed.');
      } else {
        console.log('Skipped bundled skill installation.');
      }
      console.log(`Receipt: ${r.receipt}`);
      return;
    }

    if (command === 'quickstart') {
      const q = quickstartProject({
        root,
        projectName: args['project-name'] || args.projectName || args.project,
        goal: args.goal || args.g || 'Build the first playable slice',
        stylePack: args['style-pack'] || args.style || 'generic',
        platforms: csv(args.platforms || args.platform || 'mobile,desktop'),
        codexHome: args['codex-home'],
        installSkills: bool(args['install-skills'], true),
        force: bool(args.force, false)
      });
      console.log(`GodotBuddy quickstart ready: ${q.state.slug}`);
      console.log(`Workspace: ${path.join(q.root, '.godotbuddy')}`);
      console.log(`Next: keep the board open and let Codex guide the journey.`);
      if (bool(args.open, true)) {
        const info = await startServer({ root: q.root, run: q.state.slug, port: Number(args.port || 41737) });
        console.log(`GodotBuddy board: ${info.url}`);
        openUrl(info.url);
        await new Promise(() => {});
      }
      return;
    }

    if (command === 'scaffold') {
      const r = scaffoldGodotProject({ root, projectName: args.project || args['project-name'], force: bool(args.force, false) });
      console.log(`Scaffolded Godot project: ${r.root}`);
      if (bool(args['install-addon'], false)) {
        const dest = installGodotAddon({ project: r.root, force: bool(args.force, false) });
        console.log(`Installed GodotBuddy editor addon: ${dest}`);
      }
      if (bool(args.setup, false) || bool(args['install-skills'], false)) {
        const setup = setupFirstRun({
          root: r.root,
          projectName: r.name,
          stylePack: args['style-pack'] || args.style || 'generic',
          platforms: csv(args.platforms || args.platform || 'mobile,desktop'),
          codexHome: args['codex-home'],
          installSkills: bool(args['install-skills'], true),
          includePersonalStylePacks: bool(args['include-personal-style-packs'], false),
          force: bool(args.force, false)
        });
        console.log(`Configured first-run setup: ${setup.receipt}`);
      }
      return;
    }

    if (command === 'prep') {
      const goal = args.goal || args.g || args._.join(' ');
      const state = createRun({
        root,
        title: args.title || goal,
        goal,
        stylePack: args['style-pack'] || args.style || 'generic',
        force: bool(args.force, false)
      });
      console.log(`Prepared run: ${state.slug}`);
      console.log(`Run folder: ${runDir(root, state.slug)}`);
      console.log(`Next: godotbuddy board --run ${state.slug}`);
      return;
    }

    if (command === 'asset') {
      const name = args.name || args._.join(' ');
      if (!name) throw new Error('Missing --name');
      const asset = addAsset({
        root,
        slug: args.run,
        name,
        type: args.type || args.category || 'asset',
        style: args.style || 'generic',
        states: csv(args.states),
        animations: csv(args.animations),
        variations: csv(args.variations),
        notes: args.notes || ''
      });
      console.log(`Added asset request: ${asset.id}`);
      console.log(`Request: ${runDir(root, loadRun(root, args.run).slug)}/${asset.manifest}`);
      return;
    }

    if (command === 'personalize') {
      const name = args.name || args._.join(' ');
      const refs = csv(args.reference || args.references || args.file || args.files);
      const style = personalizeStylePack({
        root,
        name,
        description: args.description || args.desc || '',
        artStyle: args['art-style'] || args.artStyle || args.style || 'custom',
        spriteScale: args['sprite-scale'] || args.spriteScale || '64x64',
        references: refs,
        install: bool(args.install, false),
        codexHome: args['codex-home'],
        force: bool(args.force, false)
      });
      console.log(`Created local style pack: ${style.slug}`);
      console.log(`Style pack folder: ${style.dir}`);
      console.log(`Receipt: ${style.receipt}`);
      return;
    }

    if (command === 'attach') {
      if (!args.file) throw new Error('Missing --file');
      const dest = attachFile({ root, slug: args.run, assetId: args.asset, file: args.file, kind: args.kind || 'final' });
      console.log(Array.isArray(dest) ? `Attached ${dest.length} files.` : `Attached file: ${dest}`);
      return;
    }

    if (command === 'task') {
      const title = args.title || args._.join(' ');
      if (!title) throw new Error('Missing --title');
      const task = addTask({ root, slug: args.run, title, lane: args.lane || 'backlog', agent: args.agent || 'godot_worker', scope: args.scope || '' });
      console.log(`Added task: ${task.id}`);
      return;
    }

    if (command === 'move') {
      if (!args.task || !args.lane) throw new Error('Missing --task or --lane');
      const task = moveTask({ root, slug: args.run, taskId: args.task, lane: args.lane });
      console.log(`Moved task ${task.id} to ${task.lane}`);
      return;
    }

    if (command === 'receipt') {
      const title = args.title || 'Receipt';
      const files = csv(args.file || args.files);
      const receipt = addReceipt({ root, slug: args.run, title, body: args.body || '', files });
      console.log(`Recorded receipt: ${receipt.path}`);
      return;
    }

    if (command === 'qa') {
      const report = qaSpriteAssets({ root, slug: args.run });
      console.log(`Sprite QA status: ${report.status}`);
      console.log(`Findings: ${report.findings.length}`);
      console.log(`Report: ${report.reportPath}`);
      return;
    }

    if (command === 'promote-style-pack') {
      const promoted = promoteStylePack({
        root,
        slug: args.style || args.slug || args.name || args._[0],
        dest: args.dest,
        force: bool(args.force, false)
      });
      console.log(`Promoted style pack: ${promoted.slug}`);
      console.log(`Destination: ${promoted.dest}`);
      console.log(`Receipt: ${promoted.receipt}`);
      return;
    }

    if (command === 'status') {
      const hub = listRuns(root);
      const state = loadRun(root, args.run);
      console.log(`GodotBuddy root: ${path.join(root, '.godotbuddy')}`);
      console.log(`Active run: ${hub.active_run || '(none)'}`);
      if (state) {
        console.log(`Title: ${state.title}`);
        console.log(`Status: ${state.status}`);
        console.log(`Tasks: ${state.tasks.length}`);
        console.log(`Assets: ${state.assets.length}`);
        console.log(`Receipts: ${state.receipts.length}`);
      }
      return;
    }

    if (command === 'board') {
      const port = Number(args.port || 41737);
      const host = args.host || '127.0.0.1';
      const info = await startServer({ root, run: args.run, host, port });
      console.log(`GodotBuddy board: ${info.url}`);
      console.log(`Project root: ${root}`);
      if (bool(args.open, true)) openUrl(info.url);
      await new Promise(() => {});
      return;
    }

    if (command === 'doctor') {
      const checks = doctor({ root });
      for (const c of checks) {
        const icon = c.ok ? '✓' : c.level === 'optional' ? '!' : '✗';
        console.log(`${icon} ${c.name}${c.detail ? ` — ${c.detail}` : ''}`);
      }
      const failed = checks.filter(c => !c.ok && c.level !== 'optional').length;
      process.exitCode = failed ? 1 : 0;
      return;
    }

    if (command === 'install-addon') {
      const dest = installGodotAddon({ project: args.project || root, force: bool(args.force, false) });
      console.log(`Installed GodotBuddy Godot editor addon: ${dest}`);
      return;
    }

    if (command === 'install-skills') {
      const installed = installBundledSkills({
        codexHome: args['codex-home'],
        force: bool(args.force, false),
        includePersonalStylePacks: bool(args['include-personal-style-packs'], false)
      });
      console.log(installed.length ? `Installed ${installed.length} bundled skills:` : 'No new bundled skills installed.');
      for (const p of installed) console.log(`- ${p}`);
      return;
    }

    if (command === 'demo') {
      const demoRoot = path.resolve(args.root || path.join(process.cwd(), 'godotbuddy-demo'));
      scaffoldGodotProject({ root: demoRoot, projectName: 'GodotBuddy Demo', force: true });
      installGodotAddon({ project: demoRoot, force: true });
      const state = createRun({ root: demoRoot, title: 'First playable slice', goal: 'Prepare and review a Godot-ready first playable slice.', stylePack: 'generic', force: true });
      addAsset({ root: demoRoot, slug: state.slug, name: 'player', type: 'character', animations: ['idle','walk'], style: 'generic' });
      addReceipt({ root: demoRoot, slug: state.slug, title: 'Demo workspace created', body: 'The demo run contains a generic first playable asset request and proof board.', files: [] });
      console.log(`Demo project: ${demoRoot}`);
      console.log(`Run: ${state.slug}`);
      if (bool(args.open, false)) {
        const info = await startServer({ root: demoRoot, run: state.slug, port: Number(args.port || 41737) });
        console.log(`GodotBuddy board: ${info.url}`);
        openUrl(info.url);
        await new Promise(() => {});
      }
      return;
    }

    if (command === 'copy-suite') {
      const dest = path.resolve(args.dest || path.join(root, 'tools', 'godotbuddy-skill-suite'));
      copyRecursive(path.join(packageRoot(), 'bundled-skills'), dest, { overwrite: bool(args.force, true) });
      console.log(`Copied bundled skills to ${dest}`);
      return;
    }

    console.error(`Unknown command: ${command}\n`);
    printHelp();
    process.exitCode = 1;
  } catch (err) {
    console.error(`GodotBuddy error: ${err.message}`);
    process.exitCode = 1;
  }
}

main();
