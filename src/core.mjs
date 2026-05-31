import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';

export const GB_DIR = '.godotbuddy';

export function nowIso() {
  return new Date().toISOString();
}

export function slugify(input, fallback = 'godot-run') {
  const s = String(input || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 72);
  return s || fallback;
}

export function shortId(prefix = 'id') {
  return `${prefix}-${crypto.randomBytes(3).toString('hex')}`;
}

export function repoRoot(start = process.cwd()) {
  let dir = path.resolve(start);
  while (true) {
    if (fs.existsSync(path.join(dir, 'project.godot')) || fs.existsSync(path.join(dir, GB_DIR))) return dir;
    const parent = path.dirname(dir);
    if (parent === dir) return path.resolve(start);
    dir = parent;
  }
}

export function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

export function readJson(file, fallback = null) {
  if (!fs.existsSync(file)) return fallback;
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

export function writeJson(file, data) {
  ensureDir(path.dirname(file));
  fs.writeFileSync(file, JSON.stringify(data, null, 2) + '\n');
}

export function writeText(file, text) {
  ensureDir(path.dirname(file));
  fs.writeFileSync(file, text);
}

export function copyRecursive(src, dest, options = {}) {
  const { overwrite = true } = options;
  if (!fs.existsSync(src)) return;
  const st = fs.statSync(src);
  if (st.isDirectory()) {
    ensureDir(dest);
    for (const entry of fs.readdirSync(src)) {
      copyRecursive(path.join(src, entry), path.join(dest, entry), options);
    }
  } else {
    ensureDir(path.dirname(dest));
    if (!overwrite && fs.existsSync(dest)) return;
    fs.copyFileSync(src, dest);
  }
}

export function packageRoot() {
  return path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
}

export function godotBuddyRoot(root = repoRoot()) {
  return path.join(root, GB_DIR);
}

export function runsDir(root = repoRoot()) {
  return path.join(godotBuddyRoot(root), 'runs');
}

export function runDir(root, slug) {
  return path.join(runsDir(root), slug);
}

export function hubPath(root = repoRoot()) {
  return path.join(godotBuddyRoot(root), 'hub.json');
}

export function configPath(root = repoRoot()) {
  return path.join(godotBuddyRoot(root), 'config.json');
}

export function installManifestPath(root = repoRoot()) {
  return path.join(godotBuddyRoot(root), 'install-manifest.json');
}

export function stylePacksDir(root = repoRoot()) {
  return path.join(godotBuddyRoot(root), 'style-packs');
}

export function moodboardDir(root = repoRoot()) {
  return path.join(godotBuddyRoot(root), 'moodboard');
}

export function moodboardPath(root = repoRoot()) {
  return path.join(moodboardDir(root), 'moodboard.json');
}

export function initWorkspace({ root = process.cwd(), projectName = null, force = false } = {}) {
  root = path.resolve(root);
  const gb = godotBuddyRoot(root);
  ensureDir(gb);
  ensureDir(path.join(gb, 'runs'));
  ensureDir(path.join(gb, 'receipts'));
  ensureDir(path.join(gb, 'shared', 'references'));
  ensureDir(path.join(gb, 'shared', 'style-guides'));
  ensureDir(path.join(gb, 'shared', 'templates'));
  ensureDir(path.join(gb, 'moodboard', 'references'));
  ensureDir(path.join(root, 'docs', 'godotbuddy'));
  const cfgFile = configPath(root);
  const existing = readJson(cfgFile, null);
  const cfg = existing && !force ? existing : {
    version: '0.1.0',
    project_name: projectName || inferProjectName(root),
    project_root: root,
    platform_focus: ['mobile', 'desktop'],
    default_engine: 'godot-4.x',
    default_style_pack: 'generic',
    board: {
      preferred_host: '127.0.0.1',
      preferred_port: 41737,
      auto_refresh_seconds: 5
    },
    skills: {
      recommended_layout: 'sibling skills under ~/.codex/skills, orchestrated by GodotBuddy'
    },
    created_at: nowIso(),
    updated_at: nowIso()
  };
  writeJson(cfgFile, cfg);

  const hubFile = hubPath(root);
  const hub = readJson(hubFile, null) || {
    version: '0.1.0',
    active_run: null,
    runs: [],
    updated_at: nowIso()
  };
  writeJson(hubFile, hub);

  const moodFile = moodboardPath(root);
  if (!fs.existsSync(moodFile)) {
    writeJson(moodFile, {
      version: '0.1.0',
      updated_at: nowIso(),
      references: []
    });
  }

  const readme = path.join(root, 'docs', 'godotbuddy', 'README.md');
  if (!fs.existsSync(readme) || force) {
    fs.writeFileSync(readme, `# GodotBuddy\n\nLocal workflow state, asset boards, receipts, and proof files for this Godot project.\n\nRun \`godotbuddy board\` to open the local dashboard.\n`);
  }

  const artEngine = path.join(gb, 'ART_ENGINE.md');
  if (!fs.existsSync(artEngine) || force) {
    fs.writeFileSync(artEngine, `# GodotBuddy Art Engine Contract\n\nGodotBuddy uses Codex plus the installed image generation capability for visual creation. Local scripts and CLI commands prepare prompts, manifests, QA folders, frame contracts, and Godot packaging targets; they must not fabricate final sprite art.\n\nDefault sprite outputs should follow this contract:\n\n- create a canonical base reference before animation/state rows\n- use reference images and moodboard notes as style/identity locks\n- generate exact declared frame counts\n- use flat chroma-key or true transparent backgrounds\n- remove labels, frame numbers, grids, scenery, shadows, glows, speed lines, and detached effects unless explicitly requested\n- package transparent frames, spritesheet PNG/WebP, contact sheet, validation, and Godot starter resources\n\nPrepared art runs live under \`.godotbuddy/runs/<run>/sprite-runs/<asset>/\`.\n`);
  }

  return { root, gb, cfg };
}

export function loadMoodboard(root = repoRoot()) {
  initWorkspace({ root });
  const empty = {
    version: '0.1.0',
    updated_at: nowIso(),
    references: []
  };
  const board = readJson(moodboardPath(root), empty);
  if (!fs.existsSync(moodboardPath(root))) writeJson(moodboardPath(root), board);
  return board;
}

export function saveMoodboard(root, moodboard) {
  moodboard.updated_at = nowIso();
  writeJson(moodboardPath(root), moodboard);
  return moodboard;
}

export function addMoodboardReference({
  root = repoRoot(),
  file,
  title = null,
  notes = '',
  tags = [],
  useFor = '',
  avoid = '',
  weight = 3
} = {}) {
  if (!file) throw new Error('Missing moodboard reference file.');
  initWorkspace({ root });
  const src = path.resolve(file);
  if (!fs.existsSync(src) || !fs.statSync(src).isFile()) throw new Error(`Reference file does not exist: ${src}`);
  const id = shortId('ref');
  const safeName = path.basename(src).replace(/[^a-zA-Z0-9._-]+/g, '-');
  const rel = path.join(GB_DIR, 'moodboard', 'references', `${id}-${safeName}`);
  const dest = path.join(root, rel);
  copyRecursive(src, dest, { overwrite: true });
  const ref = {
    id,
    title: title || path.basename(src, path.extname(src)),
    path: rel,
    notes,
    tags: Array.isArray(tags) ? tags : String(tags || '').split(',').map(s => s.trim()).filter(Boolean),
    use_for: useFor,
    avoid,
    weight: Number(weight) || 3,
    created_at: nowIso(),
    updated_at: nowIso()
  };
  const moodboard = loadMoodboard(root);
  moodboard.references.push(ref);
  saveMoodboard(root, moodboard);
  return ref;
}

export function updateMoodboardReference({ root = repoRoot(), id, patch = {} } = {}) {
  if (!id) throw new Error('Missing moodboard reference id.');
  const moodboard = loadMoodboard(root);
  const ref = moodboard.references.find(r => r.id === id);
  if (!ref) throw new Error(`Moodboard reference not found: ${id}`);
  for (const key of ['title', 'notes', 'use_for', 'avoid']) {
    if (patch[key] != null) ref[key] = patch[key];
  }
  if (patch.tags != null) {
    ref.tags = Array.isArray(patch.tags) ? patch.tags : String(patch.tags).split(',').map(s => s.trim()).filter(Boolean);
  }
  if (patch.weight != null) ref.weight = Number(patch.weight) || ref.weight;
  ref.updated_at = nowIso();
  saveMoodboard(root, moodboard);
  return ref;
}

export function composeMoodboardContext(root = repoRoot()) {
  const moodboard = loadMoodboard(root);
  const refs = moodboard.references
    .slice()
    .sort((a, b) => (b.weight || 0) - (a.weight || 0))
    .slice(0, 8);
  if (!refs.length) return '';
  return refs.map(ref => {
    const parts = [
      `${ref.title} (weight ${ref.weight || 3})`,
      ref.tags && ref.tags.length ? `tags: ${ref.tags.join(', ')}` : '',
      ref.use_for ? `use for: ${ref.use_for}` : '',
      ref.notes ? `notes: ${ref.notes}` : '',
      ref.avoid ? `avoid: ${ref.avoid}` : ''
    ].filter(Boolean);
    return `- ${parts.join('; ')}`;
  }).join('\n');
}

export function setupFirstRun({
  root = process.cwd(),
  projectName = null,
  stylePack = 'generic',
  platforms = ['mobile', 'desktop'],
  codexHome = process.env.CODEX_HOME || path.join(os.homedir(), '.codex'),
  installSkills = true,
  includePersonalStylePacks = false,
  force = false
} = {}) {
  root = path.resolve(root);
  const initialized = initWorkspace({ root, projectName, force: false });
  const cfgFile = configPath(root);
  const cfg = readJson(cfgFile, initialized.cfg);
  const platformFocus = Array.isArray(platforms) ? platforms : String(platforms || '')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);

  cfg.project_name = projectName || cfg.project_name || inferProjectName(root);
  cfg.platform_focus = platformFocus.length ? platformFocus : ['mobile', 'desktop'];
  cfg.default_style_pack = stylePack || cfg.default_style_pack || 'generic';
  cfg.personalization = {
    ...(cfg.personalization || {}),
    style_pack: cfg.default_style_pack,
    platform_focus: cfg.platform_focus,
    updated_at: nowIso()
  };
  cfg.skills = {
    ...(cfg.skills || {}),
    install_mode: 'bundled',
    codex_home: path.resolve(codexHome),
    recommended_layout: 'sibling skills under ~/.codex/skills, orchestrated by GodotBuddy'
  };

  const installedSkills = installSkills
    ? installBundledSkills({ codexHome, force, includePersonalStylePacks })
    : [];

  if (installSkills) {
    cfg.skills.installed_at = nowIso();
    cfg.skills.installed = installedSkills.map(p => path.basename(p)).sort();
  }

  cfg.updated_at = nowIso();
  writeJson(cfgFile, cfg);
  const manifest = {
    version: '0.1.0',
    project_name: cfg.project_name,
    project_root: root,
    created_at: nowIso(),
    updated_at: nowIso(),
    codex_home: path.resolve(codexHome),
    installed_skills: installedSkills.map(p => ({
      name: path.basename(p),
      path: p
    })),
    commands: {
      setup: {
        command: 'setup',
        style_pack: cfg.default_style_pack,
        platforms: cfg.platform_focus,
        include_personal_style_packs: includePersonalStylePacks
      }
    }
  };
  writeJson(installManifestPath(root), manifest);

  const receipt = path.join(godotBuddyRoot(root), 'receipts', 'first-run-setup.md');
  const lines = [
    '# GodotBuddy First-Run Setup',
    '',
    `Project: ${cfg.project_name}`,
    `Style pack: ${cfg.default_style_pack}`,
    `Platforms: ${cfg.platform_focus.join(', ')}`,
    `Codex home: ${path.resolve(codexHome)}`,
    '',
    installSkills
      ? `Installed bundled skills: ${installedSkills.length}`
      : 'Installed bundled skills: skipped',
    '',
    ...installedSkills.map(p => `- ${path.basename(p)}`)
  ];
  fs.writeFileSync(receipt, `${lines.join('\n')}\n`);

  return { root, config: cfg, installedSkills, receipt };
}

export function quickstartProject({
  root = process.cwd(),
  projectName = null,
  goal = 'Build the first playable slice',
  stylePack = 'generic',
  platforms = ['mobile', 'desktop'],
  codexHome = process.env.CODEX_HOME || path.join(os.homedir(), '.codex'),
  installSkills = true,
  force = false
} = {}) {
  const setup = setupFirstRun({ root, projectName, stylePack, platforms, codexHome, installSkills, force });
  const state = createRun({ root, title: goal, goal, stylePack, force });
  const journeyTasks = [
    {
      title: 'Personalize the visual style',
      lane: 'scouting',
      agent: 'godot_asset_director',
      scope: 'Collect reference art, answer style questions, and create a local style pack before asset generation.'
    },
    {
      title: 'Request the first playable assets',
      lane: 'asset_pipeline',
      agent: 'godot_producer',
      scope: 'Identify the smallest useful asset list for the first playable slice.'
    },
    {
      title: 'Run sprite and import QA',
      lane: 'qa',
      agent: 'godot_qa',
      scope: 'Check sprite files, manifests, previews, and Godot import readiness before marking the slice complete.'
    }
  ];
  for (const task of journeyTasks) addTask({ root, slug: state.slug, ...task });
  const reloaded = loadRun(root, state.slug);
  const manifest = readJson(installManifestPath(root), {});
  manifest.commands = {
    ...(manifest.commands || {}),
    quickstart: {
      command: 'quickstart',
      run: state.slug,
      goal,
      created_at: nowIso()
    }
  };
  manifest.updated_at = nowIso();
  writeJson(installManifestPath(root), manifest);
  addReceipt({
    root,
    slug: state.slug,
    title: 'Quickstart journey created',
    body: 'GodotBuddy prepared a guided board with visual style, asset request, integration, and QA tasks.',
    files: ['.godotbuddy/install-manifest.json']
  });
  return { ...setup, state: reloaded || state, manifest };
}

export function personalizeStylePack({
  root = repoRoot(),
  name,
  description = '',
  artStyle = 'custom',
  spriteScale = '64x64',
  references = [],
  install = false,
  codexHome = process.env.CODEX_HOME || path.join(os.homedir(), '.codex'),
  force = false
} = {}) {
  if (!name) throw new Error('Missing style pack name.');
  initWorkspace({ root });
  const slug = slugify(name, 'custom-style');
  const dir = path.join(stylePacksDir(root), slug);
  if (fs.existsSync(dir) && !force) throw new Error(`Style pack already exists: ${slug}. Use --force to overwrite.`);
  if (fs.existsSync(dir) && force) fs.rmSync(dir, { recursive: true, force: true });
  ensureDir(path.join(dir, 'references'));
  ensureDir(path.join(dir, 'scripts'));
  ensureDir(path.join(dir, 'examples'));

  const copiedRefs = [];
  for (const ref of references || []) {
    const src = typeof ref === 'string' ? ref : ref.path;
    if (!src) continue;
    const abs = path.resolve(src);
    if (!fs.existsSync(abs) || !fs.statSync(abs).isFile()) throw new Error(`Reference file does not exist: ${abs}`);
    const destRel = path.join('references', path.basename(abs));
    copyRecursive(abs, path.join(dir, destRel), { overwrite: true });
    copiedRefs.push(destRel);
  }

  const pack = {
    version: '0.1.0',
    slug,
    name,
    description,
    art_style: artStyle,
    sprite_scale: spriteScale,
    references: copiedRefs,
    status: 'local',
    created_at: nowIso(),
    updated_at: nowIso(),
    qa: {
      checklist: [
        'Readable at target sprite scale',
        'Consistent silhouette and palette',
        'Transparent backgrounds for sprites',
        'Animation states named clearly',
        'Godot import manifest included when generated'
      ]
    }
  };
  writeJson(path.join(dir, 'style-pack.json'), pack);
  writeText(path.join(dir, 'SKILL.md'), `---\nname: ${slug}\ndescription: Local GodotBuddy style pack for ${name}\n---\n\n# ${name}\n\n${description || 'Use this local style pack for Godot-ready sprite generation.'}\n\n## Art Direction\n\n- Style: ${artStyle}\n- Target sprite scale: ${spriteScale}\n- Reference folder: \`references/\`\n\n## Output Contract\n\nCreate readable Godot-ready sprites with transparent backgrounds, consistent frame dimensions, clear state names, and an import manifest when assets are finalized.\n`);

  const cfg = readJson(configPath(root), {});
  cfg.default_style_pack = slug;
  cfg.personalization = {
    ...(cfg.personalization || {}),
    style_pack: slug,
    style_packs: [
      ...((cfg.personalization && cfg.personalization.style_packs) || []).filter(pack => pack.slug !== slug),
      { slug, name, path: path.relative(root, dir), updated_at: pack.updated_at }
    ],
    updated_at: nowIso()
  };
  cfg.updated_at = nowIso();
  writeJson(configPath(root), cfg);

  const manifest = readJson(installManifestPath(root), { version: '0.1.0', commands: {} });
  manifest.local_style_packs = [
    ...((manifest.local_style_packs) || []).filter(pack => pack.slug !== slug),
    { slug, name, path: path.relative(root, dir), status: 'local' }
  ];
  manifest.commands = {
    ...(manifest.commands || {}),
    personalize: { command: 'personalize', style_pack: slug, updated_at: nowIso() }
  };
  manifest.updated_at = nowIso();
  writeJson(installManifestPath(root), manifest);

  if (install) {
    const dest = path.join(codexHome, 'skills', slug);
    if (fs.existsSync(dest) && force) fs.rmSync(dest, { recursive: true, force: true });
    copyRecursive(dir, dest, { overwrite: force });
  }

  const receipt = path.join(godotBuddyRoot(root), 'receipts', `style-pack-${slug}.md`);
  writeText(receipt, `# Style Pack Personalized\n\nStyle pack: ${name}\nSlug: ${slug}\nReferences: ${copiedRefs.length}\n`);
  return { slug, dir, pack, receipt };
}

function parseCellSize(value, fallback = [256, 256]) {
  const m = String(value || '').toLowerCase().match(/^\s*(\d+)\s*[x,]\s*(\d+)\s*$/);
  if (!m) return fallback;
  return [Number(m[1]), Number(m[2])];
}

function defaultArtOutputs(type) {
  if (['character', 'npc', 'player'].includes(type)) {
    return [
      { id: 'idle', kind: 'animation', frame_count: 4, description: 'gentle breathing and blink loop', layout: 'strip-h', loop: true, fps: 5, anchor: 'bottom' },
      { id: 'walk_down', kind: 'animation', frame_count: 6, description: 'walking toward camera/front/down direction', layout: 'strip-h', loop: true, fps: 8, anchor: 'bottom' },
      { id: 'walk_up', kind: 'animation', frame_count: 6, description: 'walking away from camera/back/up direction', layout: 'strip-h', loop: true, fps: 8, anchor: 'bottom' },
      { id: 'walk_left', kind: 'animation', frame_count: 6, description: 'side-view walk cycle facing left', layout: 'strip-h', loop: true, fps: 8, anchor: 'bottom' },
      { id: 'walk_right', kind: 'animation', frame_count: 6, description: 'side-view walk cycle facing right', layout: 'strip-h', loop: true, fps: 8, anchor: 'bottom' }
    ];
  }
  if (['furniture', 'prop', 'object'].includes(type)) {
    return [
      { id: 'clean', kind: 'state', frame_count: 1, description: 'clean/tidy state', layout: 'single', loop: false, fps: 1, anchor: 'center' },
      { id: 'dirty', kind: 'state', frame_count: 1, description: 'dirty/messy state of the same object', layout: 'single', loop: false, fps: 1, anchor: 'center' }
    ];
  }
  if (['map', 'room', 'dollhouse'].includes(type)) {
    return [{ id: 'map_base', kind: 'map', frame_count: 1, description: 'single clean map or room background with no UI labels', layout: 'single', loop: false, fps: 1, anchor: 'center' }];
  }
  return [{ id: 'default', kind: 'sprite', frame_count: 1, description: 'single game-ready sprite', layout: 'single', loop: false, fps: 1, anchor: 'center' }];
}

function outputFromName(name, kind) {
  return {
    id: slugify(name, kind).replace(/-/g, '_'),
    kind,
    frame_count: kind === 'animation' ? 6 : 1,
    description: String(name || '').replace(/[_-]+/g, ' '),
    layout: kind === 'animation' ? 'strip-h' : 'single',
    loop: kind === 'animation',
    fps: kind === 'animation' ? 8 : 1,
    anchor: kind === 'animation' ? 'bottom' : 'center'
  };
}

function artPrompt(request, job) {
  const key = request.atlas.chroma_key;
  const cell = `${request.atlas.cell_width}x${request.atlas.cell_height}`;
  const shared = `Asset: ${request.asset_name}
Type: ${request.asset_type}
Description: ${request.description}
Style lock: ${request.style_notes || 'Use the moodboard and references exactly as the style source.'}
Moodboard context:
${request.moodboard_context || 'No moodboard context recorded.'}

Strict sprite rules: produce game-ready sprite source art only. Use a perfectly flat ${key} chroma-key background unless true alpha is explicitly supported. No text, labels, frame numbers, visible grids, borders, UI panels, watermarks, scenery, cast shadows, floor shadows, glows, speed lines, blur, dust clouds, or detached effects. Keep the asset complete, readable at target size, and separated from the chroma key.`;
  if (job.id === 'base') {
    return `Create the canonical base reference for this game sprite.

${shared}

Output one centered full-body/object reference image. This base becomes the identity and style source for every state or animation row.
`;
  }
  if (job.frame_count === 1) {
    return `Create one sprite state for this asset.

${shared}

State id: ${job.id}
State description: ${job.description}
Target transparent cell after processing: ${cell}

It must be the same asset identity as the canonical base, not a redesign.
`;
  }
  return `Create an animation sprite strip for this asset.

${shared}

Animation id: ${job.id}
Animation description: ${job.description}
Frame count: exactly ${job.frame_count}
Layout: ${job.layout}; place complete frames left-to-right, evenly spaced, one pose per slot.
Target transparent cell after processing: ${cell}

Use the canonical base and references as identity locks. Show motion through pose changes only.
`;
}

export function prepareArtAssetRun({
  root = repoRoot(),
  slug = null,
  name,
  type = 'sprite',
  style = null,
  description = '',
  states = [],
  animations = [],
  variations = [],
  references = [],
  cellSize = null,
  columns = 8,
  chromaKey = '#00ff00',
  force = false
} = {}) {
  if (!name) throw new Error('Missing art asset name.');
  initWorkspace({ root });
  const state = loadRun(root, slug) || createRun({ root, title: 'Art engine run', goal: 'Create game-ready sprite assets', force: false });
  const assetId = slugify(name, 'sprite-asset');
  const styleName = style || readJson(configPath(root), {})?.default_style_pack || 'generic';
  const [cellWidth, cellHeight] = parseCellSize(cellSize, ['character', 'npc', 'player'].includes(type) ? [256, 320] : [256, 256]);
  const outputs = [
    ...states.map(s => outputFromName(s, 'state')),
    ...animations.map(a => outputFromName(a, 'animation')),
    ...variations.map(v => outputFromName(v, 'variant'))
  ];
  const finalOutputs = outputs.length ? outputs : defaultArtOutputs(type);
  const spriteRunRoot = path.join(runDir(root, state.slug), 'sprite-runs', assetId);
  if (fs.existsSync(spriteRunRoot) && force) fs.rmSync(spriteRunRoot, { recursive: true, force: true });
  if (fs.existsSync(spriteRunRoot) && !force) throw new Error(`Art run already exists: ${spriteRunRoot}. Use --force to overwrite.`);
  for (const sub of ['prompts', 'references', 'decoded', 'frames', 'final', 'qa/previews', 'godot']) ensureDir(path.join(spriteRunRoot, sub));

  const copiedRefs = [];
  for (const ref of references || []) {
    const abs = path.resolve(ref);
    if (!fs.existsSync(abs) || !fs.statSync(abs).isFile()) throw new Error(`Reference file does not exist: ${abs}`);
    const dest = path.join(spriteRunRoot, 'references', path.basename(abs));
    copyRecursive(abs, dest, { overwrite: true });
    copiedRefs.push(dest);
  }

  const request = {
    version: '0.1.1',
    asset_name: name,
    slug: assetId,
    asset_type: type,
    description: description || name,
    style_pack: styleName,
    style_notes: `Style pack: ${styleName}`,
    moodboard_context: composeMoodboardContext(root),
    references: copiedRefs,
    outputs: finalOutputs,
    atlas: {
      cell_width: cellWidth,
      cell_height: cellHeight,
      columns,
      padding: 12,
      background: 'chroma',
      chroma_key: chromaKey,
      chroma_tolerance: 42
    },
    godot: {
      texture_path: `res://assets/sprites/${assetId}/spritesheet.png`,
      expected_files: ['spritesheet.png', 'spritesheet.webp', 'frames-manifest.json', `${assetId}_spriteframes.tres`, `${assetId}_animated_sprite_2d.tscn`]
    },
    created_at: nowIso()
  };
  const jobs = [
    {
      id: 'base',
      kind: 'base',
      frame_count: 1,
      layout: 'single',
      status: 'pending',
      requires: [],
      input_images: copiedRefs.map(p => ({ path: p, role: 'style/identity reference' })),
      prompt_path: path.join(spriteRunRoot, 'prompts', 'base.txt'),
      decoded_path: path.join(spriteRunRoot, 'decoded', 'base.png')
    },
    ...finalOutputs.map(output => ({
      ...output,
      status: 'pending',
      requires: ['base'],
      input_images: [
        { path: path.join(spriteRunRoot, 'decoded', 'base.png'), role: 'canonical base reference after base is recorded' },
        ...copiedRefs.map(p => ({ path: p, role: 'style/identity reference' }))
      ],
      prompt_path: path.join(spriteRunRoot, 'prompts', `${output.id}.txt`),
      decoded_path: path.join(spriteRunRoot, 'decoded', `${output.id}.png`)
    }))
  ];
  for (const job of jobs) writeText(job.prompt_path, artPrompt(request, job));
  writeJson(path.join(spriteRunRoot, 'asset_request.json'), request);
  writeJson(path.join(spriteRunRoot, 'imagegen-jobs.json'), { version: '0.1.1', run_dir: spriteRunRoot, asset_name: name, slug: assetId, jobs });
  writeJson(path.join(spriteRunRoot, 'output_contract.json'), {
    version: '0.1.1',
    based_on: 'Codex Hatch/Pet style production contract',
    required_final_files: [
      'references/canonical-base.png',
      'frames/frames-manifest.json',
      'final/spritesheet.png',
      'final/spritesheet.webp',
      'final/validation.json',
      'qa/contact-sheet.png',
      'qa/run-summary.json',
      'godot/godot_import_manifest.json',
      `godot/${assetId}_spriteframes.tres`
    ],
    qa_rules: [
      'Same asset identity across every row/state',
      'Exact declared frame counts',
      'Transparent final frames with safe padding',
      'No labels, frame numbers, grids, scenery, watermarks, shadows, glows, speed lines, or detached effects',
      'Contact sheet visually reviewed before acceptance',
      'Godot starter resources generated before ready_for_import'
    ],
    image_generation: 'Use Codex image generation or the installed imagegen skill for visual jobs; deterministic scripts only process generated images.'
  });
  writeText(path.join(spriteRunRoot, 'README.md'), `# ${name} Art Run\n\nThis is a GodotBuddy art-engine run. Generate the \`base\` job first using \`prompts/base.txt\`, then record the selected image as \`decoded/base.png\` and \`references/canonical-base.png\`. Generate each pending state/animation job from \`imagegen-jobs.json\` using the canonical base and references.\n\nFinal output should match \`output_contract.json\` and include transparent frames, spritesheet PNG/WebP, QA contact sheet, validation, and Godot starter resources.\n`);

  const asset = addAsset({ root, slug: state.slug, name, type, style: styleName, states, animations, variations, notes: description });
  const reloaded = loadRun(root, state.slug);
  const existing = reloaded.assets.findIndex(a => a.id === asset.id);
  if (existing >= 0) {
    reloaded.assets[existing] = { ...reloaded.assets[existing], sprite_run: path.relative(runDir(root, state.slug), spriteRunRoot) };
  }
  writeJson(path.join(runDir(root, reloaded.slug), 'state.json'), reloaded);
  writeJson(path.join(runDir(root, reloaded.slug), 'asset-manifest.json'), { assets: reloaded.assets, updated_at: nowIso() });
  addReceipt({
    root,
    slug: state.slug,
    title: `Prepared art run for ${name}`,
    body: 'Created Hatch/Pet-style prompt, imagegen job, output contract, QA, and Godot packaging folders for this sprite asset.',
    files: [path.relative(root, path.join(spriteRunRoot, 'asset_request.json')), path.relative(root, path.join(spriteRunRoot, 'output_contract.json'))]
  });
  return { root, slug: state.slug, asset: reloaded.assets.find(a => a.id === asset.id), runRoot: spriteRunRoot, request, jobs };
}

export function qaSpriteAssets({ root = repoRoot(), slug = null } = {}) {
  const state = loadRun(root, slug);
  if (!state) throw new Error('No active run found. Run godotbuddy quickstart or prep first.');
  const findings = [];
  for (const asset of state.assets) {
    if (!asset.final_files || asset.final_files.length === 0) {
      findings.push({
        severity: 'warning',
        asset: asset.id,
        message: 'No final sprite files are attached yet.'
      });
    }
    for (const rel of asset.final_files || []) {
      const file = path.join(runDir(root, state.slug), rel);
      if (!fs.existsSync(file)) {
        findings.push({ severity: 'error', asset: asset.id, file: rel, message: 'Referenced final file is missing.' });
      } else if (!/\.(png|webp)$/i.test(rel)) {
        findings.push({ severity: 'warning', asset: asset.id, file: rel, message: 'Final sprite should usually be PNG or WebP.' });
      }
    }
    if ((asset.animations || []).length && !(asset.final_files || []).some(file => /manifest|spriteframes|frames/i.test(file))) {
      findings.push({
        severity: 'info',
        asset: asset.id,
        message: 'Animated assets should include a frames manifest or SpriteFrames resource before Godot import.'
      });
    }
  }
  const status = findings.some(f => f.severity === 'error' || f.severity === 'warning') ? 'needs_attention' : 'ready';
  const report = {
    version: '0.1.0',
    run: state.slug,
    status,
    checked_at: nowIso(),
    findings
  };
  const reportPath = path.join(runDir(root, state.slug), 'qa', 'sprite-qa-report.json');
  writeJson(reportPath, report);
  addReceipt({
    root,
    slug: state.slug,
    title: 'Sprite QA completed',
    body: `Sprite QA status: ${status}. Findings: ${findings.length}.`,
    files: [path.relative(runDir(root, state.slug), reportPath)]
  });
  return { ...report, reportPath };
}

export function promoteStylePack({ root = repoRoot(), slug, dest = null, force = false } = {}) {
  if (!slug) throw new Error('Missing style pack slug.');
  const src = path.join(stylePacksDir(root), slug);
  if (!fs.existsSync(src)) throw new Error(`Style pack not found: ${slug}`);
  const target = path.resolve(dest || path.join(root, 'godotbuddy-style-packs', slug));
  if (fs.existsSync(target) && !force) throw new Error(`Promoted style pack already exists: ${target}. Use --force to overwrite.`);
  if (fs.existsSync(target) && force) fs.rmSync(target, { recursive: true, force: true });
  copyRecursive(src, target, { overwrite: true });
  const pack = readJson(path.join(target, 'style-pack.json'), {});
  pack.status = 'promoted';
  pack.promoted_at = nowIso();
  writeJson(path.join(target, 'style-pack.json'), pack);
  const receipt = path.join(godotBuddyRoot(root), 'receipts', `promoted-style-pack-${slug}.md`);
  writeText(receipt, `# Style Pack Promoted\n\nSlug: ${slug}\nDestination: ${target}\n`);
  return { slug, dest: target, receipt };
}

export function inferProjectName(root) {
  const godot = path.join(root, 'project.godot');
  if (fs.existsSync(godot)) {
    const text = fs.readFileSync(godot, 'utf8');
    const m = text.match(/config\/name\s*=\s*"([^"]+)"/);
    if (m) return m[1];
  }
  return path.basename(path.resolve(root));
}

export function listRuns(root = repoRoot()) {
  const hub = readJson(hubPath(root), { runs: [], active_run: null });
  return hub;
}

export function loadRun(root, slug = null) {
  const hub = listRuns(root);
  const selected = slug || hub.active_run || (hub.runs[0] && hub.runs[0].slug);
  if (!selected) return null;
  const stateFile = path.join(runDir(root, selected), 'state.json');
  const state = readJson(stateFile, null);
  if (!state) return null;
  return state;
}

export function saveRun(root, state) {
  state.updated_at = nowIso();
  writeJson(path.join(runDir(root, state.slug), 'state.json'), state);
  updateHub(root, state);
  return state;
}

export function updateHub(root, state) {
  const file = hubPath(root);
  const hub = readJson(file, { version: '0.1.0', active_run: null, runs: [] });
  hub.active_run = state.slug;
  const summary = {
    slug: state.slug,
    title: state.title,
    status: state.status,
    goal: state.goal,
    created_at: state.created_at,
    updated_at: state.updated_at,
    path: path.relative(root, runDir(root, state.slug))
  };
  const idx = hub.runs.findIndex(r => r.slug === state.slug);
  if (idx >= 0) hub.runs[idx] = summary;
  else hub.runs.unshift(summary);
  hub.updated_at = nowIso();
  writeJson(file, hub);
}

export function createRun({ root = repoRoot(), title = null, goal, stylePack = 'generic', oracle = null, force = false } = {}) {
  initWorkspace({ root });
  const slug = slugify(title || goal || 'godot-run');
  const dir = runDir(root, slug);
  if (fs.existsSync(dir) && !force) {
    throw new Error(`Run already exists: ${slug}. Use --force to overwrite.`);
  }
  if (fs.existsSync(dir) && force) fs.rmSync(dir, { recursive: true, force: true });
  for (const rel of [
    'notes', 'receipts', 'requests', 'handoffs', 'assets/source', 'assets/generated', 'assets/final', 'assets/previews', 'godot', 'qa', 'board'
  ]) ensureDir(path.join(dir, rel));

  const state = {
    version: '0.1.0',
    slug,
    title: title || goal || 'GodotBuddy Run',
    goal: goal || title || 'Prepare a Godot-ready game development run.',
    style_pack: stylePack,
    status: 'active',
    created_at: nowIso(),
    updated_at: nowIso(),
    oracle: oracle || {
      type: 'human_acceptance_plus_artifact_review',
      question: 'Can the user see a Godot-ready result, import path, and proof that the requested slice works?',
      proof: []
    },
    lanes: [
      { id: 'backlog', name: 'Backlog' },
      { id: 'scouting', name: 'Scouting' },
      { id: 'asset_pipeline', name: 'Asset Pipeline' },
      { id: 'godot_integration', name: 'Godot Integration' },
      { id: 'qa', name: 'QA / Proof' },
      { id: 'done', name: 'Done' }
    ],
    tasks: [
      {
        id: shortId('task'),
        title: 'Define the Godot-ready outcome',
        lane: 'scouting',
        status: 'active',
        agent: 'godot_producer',
        scope: 'Clarify game slice, asset needs, acceptance criteria, and proof oracle.',
        receipts: [],
        created_at: nowIso(),
        updated_at: nowIso()
      },
      {
        id: shortId('task'),
        title: 'Create or collect required assets',
        lane: 'asset_pipeline',
        status: 'todo',
        agent: 'godot_asset_director',
        scope: 'Route visual work into the correct sprite generator or import existing art.',
        receipts: [],
        created_at: nowIso(),
        updated_at: nowIso()
      },
      {
        id: shortId('task'),
        title: 'Verify Godot import readiness',
        lane: 'qa',
        status: 'todo',
        agent: 'godot_qa',
        scope: 'Check file structure, manifests, previews, performance budget, and import notes.',
        receipts: [],
        created_at: nowIso(),
        updated_at: nowIso()
      }
    ],
    assets: [],
    receipts: [],
    handoffs: [],
    settings: {
      board_refresh_seconds: 5,
      mobile_first: true,
      desktop_capable: true
    }
  };

  fs.writeFileSync(path.join(dir, 'goal.md'), `# ${state.title}\n\n${state.goal}\n\n## Oracle\n\n${state.oracle.question}\n`);
  saveRun(root, state);
  writeJson(path.join(dir, 'asset-manifest.json'), { assets: state.assets, updated_at: state.updated_at });
  writeJson(path.join(dir, 'board', 'board.json'), { lanes: state.lanes, tasks: state.tasks });
  return state;
}

export function addTask({ root = repoRoot(), slug = null, title, lane = 'backlog', agent = 'godot_worker', scope = '' }) {
  const state = loadRun(root, slug);
  if (!state) throw new Error('No active run found. Run godotbuddy prep first.');
  const task = {
    id: shortId('task'),
    title,
    lane,
    status: lane === 'done' ? 'done' : 'todo',
    agent,
    scope,
    receipts: [],
    created_at: nowIso(),
    updated_at: nowIso()
  };
  state.tasks.push(task);
  saveRun(root, state);
  writeJson(path.join(runDir(root, state.slug), 'board', 'board.json'), { lanes: state.lanes, tasks: state.tasks });
  return task;
}

export function moveTask({ root = repoRoot(), slug = null, taskId, lane }) {
  const state = loadRun(root, slug);
  if (!state) throw new Error('No active run found.');
  const task = state.tasks.find(t => t.id === taskId || t.title === taskId);
  if (!task) throw new Error(`Task not found: ${taskId}`);
  task.lane = lane;
  task.status = lane === 'done' ? 'done' : (lane === 'backlog' ? 'todo' : 'active');
  task.updated_at = nowIso();
  saveRun(root, state);
  writeJson(path.join(runDir(root, state.slug), 'board', 'board.json'), { lanes: state.lanes, tasks: state.tasks });
  return task;
}

export function addAsset({ root = repoRoot(), slug = null, name, type = 'asset', style = 'generic', states = [], animations = [], variations = [], notes = '' }) {
  const state = loadRun(root, slug);
  if (!state) throw new Error('No active run found. Run godotbuddy prep first.');
  const id = slugify(name, 'asset');
  const asset = {
    id,
    name,
    type,
    style,
    states,
    animations,
    variations,
    status: 'requested',
    notes,
    source_files: [],
    generated_files: [],
    final_files: [],
    thumbnail: null,
    manifest: `requests/${id}.json`,
    created_at: nowIso(),
    updated_at: nowIso()
  };
  const existing = state.assets.findIndex(a => a.id === id);
  if (existing >= 0) state.assets[existing] = { ...state.assets[existing], ...asset };
  else state.assets.push(asset);

  const req = {
    asset_name: name,
    asset_id: id,
    category: type,
    style,
    states,
    animations,
    variations,
    notes,
    moodboard_context: composeMoodboardContext(root),
    moodboard_references: loadMoodboard(root).references.map(ref => ({
      id: ref.id,
      title: ref.title,
      path: ref.path,
      tags: ref.tags,
      use_for: ref.use_for,
      avoid: ref.avoid,
      weight: ref.weight
    })),
    recommended_skill: 'sprite-generator',
    godot: {
      mobile_first: true,
      desktop_capable: true,
      expected_outputs: ['transparent_pngs', 'spritesheet', 'frames_manifest', 'godot_import_manifest']
    }
  };
  writeJson(path.join(runDir(root, state.slug), asset.manifest), req);
  const task = {
    id: shortId('task'),
    title: `Generate/import ${name}`,
    lane: 'asset_pipeline',
    status: 'todo',
    agent: 'godot_asset_director',
    scope: `Prepare ${type} asset in ${style} style.`,
    receipts: [],
    created_at: nowIso(),
    updated_at: nowIso()
  };
  state.tasks.push(task);
  writeJson(path.join(runDir(root, state.slug), 'asset-manifest.json'), { assets: state.assets, updated_at: nowIso() });
  writeJson(path.join(runDir(root, state.slug), 'board', 'board.json'), { lanes: state.lanes, tasks: state.tasks });
  saveRun(root, state);
  return asset;
}

export function attachFile({ root = repoRoot(), slug = null, assetId = null, file, kind = 'final' }) {
  const state = loadRun(root, slug);
  if (!state) throw new Error('No active run found.');
  const src = path.resolve(file);
  if (!fs.existsSync(src)) throw new Error(`File does not exist: ${src}`);
  const stat = fs.statSync(src);
  if (stat.isDirectory()) {
    const attached = [];
    for (const entry of fs.readdirSync(src)) {
      const f = path.join(src, entry);
      if (fs.statSync(f).isFile()) attached.push(attachFile({ root, slug: state.slug, assetId, file: f, kind }));
    }
    return attached;
  }
  const asset = assetId ? state.assets.find(a => a.id === assetId || a.name === assetId) : null;
  const destRel = `assets/${kind}/${asset ? asset.id + '-' : ''}${path.basename(src)}`;
  const dest = path.join(runDir(root, state.slug), destRel);
  copyRecursive(src, dest);
  if (asset) {
    const key = kind === 'source' ? 'source_files' : kind === 'generated' ? 'generated_files' : 'final_files';
    if (!asset[key].includes(destRel)) asset[key].push(destRel);
    if (!asset.thumbnail && /\.(png|webp|jpg|jpeg|gif)$/i.test(destRel)) asset.thumbnail = destRel;
    asset.status = kind === 'final' ? 'ready_for_import' : 'in_progress';
    asset.updated_at = nowIso();
    writeJson(path.join(runDir(root, state.slug), 'asset-manifest.json'), { assets: state.assets, updated_at: nowIso() });
  }
  saveRun(root, state);
  return destRel;
}

export function addReceipt({ root = repoRoot(), slug = null, title, body = '', files = [] }) {
  const state = loadRun(root, slug);
  if (!state) throw new Error('No active run found.');
  const id = shortId('receipt');
  const rel = `receipts/${id}.md`;
  const receipt = {
    id,
    title,
    body,
    files,
    path: rel,
    created_at: nowIso()
  };
  fs.writeFileSync(path.join(runDir(root, state.slug), rel), `# ${title}\n\n${body}\n\n## Files\n\n${files.map(f => `- ${f}`).join('\n')}\n`);
  state.receipts.push(receipt);
  state.oracle.proof.push({ title, receipt: rel, created_at: receipt.created_at });
  saveRun(root, state);
  return receipt;
}

export function scaffoldGodotProject({ root = process.cwd(), projectName = null, force = false } = {}) {
  root = path.resolve(root);
  ensureDir(root);
  const name = projectName || inferProjectName(root) || path.basename(root);
  const dirs = [
    'scenes/actors', 'scenes/props', 'scenes/rooms', 'scenes/ui',
    'scripts/actors', 'scripts/props', 'scripts/rooms', 'scripts/ui',
    'assets/sprites', 'assets/ui', 'assets/audio', 'assets/fonts',
    'generated_assets', 'art_source', 'design/features', 'design/ui_kits',
    'pipeline_runs', 'exports', 'tools'
  ];
  for (const d of dirs) ensureDir(path.join(root, d));
  const projectFile = path.join(root, 'project.godot');
  if (!fs.existsSync(projectFile) || force) {
    fs.writeFileSync(projectFile, `; Engine configuration file.\n; Generated by GodotBuddy.\n\nconfig_version=5\n\n[application]\nconfig/name="${name}"\nrun/main_scene="res://scenes/Main.tscn"\n\n[display]\nwindow/size/viewport_width=1080\nwindow/size/viewport_height=1920\nwindow/handheld/orientation=1\n\n[rendering]\nrenderer/rendering_method="mobile"\ntextures/canvas_textures/default_texture_filter=1\n`);
  }
  const mainScene = path.join(root, 'scenes', 'Main.tscn');
  if (!fs.existsSync(mainScene) || force) {
    fs.writeFileSync(mainScene, `[gd_scene format=3]\n\n[node name="Main" type="Node2D"]\n`);
  }
  initWorkspace({ root, projectName: name, force: false });
  return { root, name, dirs };
}

export function installGodotAddon({ project = process.cwd(), force = false } = {}) {
  const src = path.join(packageRoot(), 'templates', 'godot-addon', 'addons', 'godotbuddy');
  const dest = path.join(path.resolve(project), 'addons', 'godotbuddy');
  if (fs.existsSync(dest) && !force) {
    throw new Error(`GodotBuddy addon already exists at ${dest}. Use --force to overwrite.`);
  }
  if (fs.existsSync(dest) && force) fs.rmSync(dest, { recursive: true, force: true });
  copyRecursive(src, dest);
  return dest;
}

export function installBundledSkills({
  codexHome = process.env.CODEX_HOME || path.join(os.homedir(), '.codex'),
  force = false,
  includePersonalStylePacks = false
} = {}) {
  const srcRoot = path.join(packageRoot(), 'bundled-skills');
  const destRoot = path.join(codexHome, 'skills');
  ensureDir(destRoot);
  const installed = [];
  if (!fs.existsSync(srcRoot)) return installed;
  const manifest = readJson(path.join(srcRoot, 'suite_manifest.json'), null);
  const entries = manifest && Array.isArray(manifest.skills)
    ? manifest.skills
    : fs.readdirSync(srcRoot);
  const personalStylePacks = new Set(manifest?.personal_style_packs || []);
  for (const entry of entries) {
    if (!includePersonalStylePacks && personalStylePacks.has(entry)) continue;
    const src = path.join(srcRoot, entry);
    if (!fs.statSync(src).isDirectory()) continue;
    if (!fs.existsSync(path.join(src, 'SKILL.md'))) continue;
    const dest = path.join(destRoot, entry);
    if (fs.existsSync(dest) && force) fs.rmSync(dest, { recursive: true, force: true });
    if (fs.existsSync(dest) && !force) continue;
    copyRecursive(src, dest);
    installed.push(dest);
  }
  return installed;
}

export function doctor({ root = repoRoot() } = {}) {
  const checks = [];
  function add(name, ok, detail = '', level = 'required') { checks.push({ name, ok, detail, level }); }
  const cfg = readJson(configPath(root), null);
  const hub = readJson(hubPath(root), null);
  const manifest = readJson(installManifestPath(root), null);
  const moodboard = readJson(moodboardPath(root), null);
  const activeRun = hub?.active_run || (hub?.runs && hub.runs[0]?.slug) || null;
  const activeRunState = activeRun ? path.join(runDir(root, activeRun), 'state.json') : null;
  const suiteManifest = readJson(path.join(packageRoot(), 'bundled-skills', 'suite_manifest.json'), null);
  const genericSkills = suiteManifest?.skills || [];
  const boardFiles = [
    path.join(packageRoot(), 'apps', 'web', 'index.html'),
    path.join(packageRoot(), 'apps', 'web', 'style.css'),
    path.join(packageRoot(), 'apps', 'web', 'app.js')
  ];
  const installedSkillNames = cfg?.skills?.installed || [];
  const codexHome = cfg?.skills?.codex_home || process.env.CODEX_HOME || path.join(os.homedir(), '.codex');
  const missingInstalledSkills = installedSkillNames.filter(name => {
    return !fs.existsSync(path.join(codexHome, 'skills', name, 'SKILL.md'));
  });

  add('Node version >= 18', Number(process.versions.node.split('.')[0]) >= 18, process.versions.node);
  add('GodotBuddy workspace', fs.existsSync(godotBuddyRoot(root)), godotBuddyRoot(root));
  add('Install manifest readable', Boolean(manifest), installManifestPath(root));
  add('Config readable', Boolean(cfg), configPath(root));
  add('Hub file readable', Boolean(hub), hubPath(root));
  add('At least one run', Boolean(hub && hub.runs && hub.runs.length), hub ? `${hub.runs.length} runs` : 'no hub');
  add('Active run state readable', Boolean(activeRunState && readJson(activeRunState, null)), activeRunState || 'no active run');
  add('Moodboard readable', Boolean(moodboard), moodboardPath(root));
  add('Board web app files', boardFiles.every(file => fs.existsSync(file)), boardFiles.map(file => path.relative(packageRoot(), file)).join(', '));
  add('Bundled generic skills', genericSkills.length >= 8, `${genericSkills.length} skills in suite manifest`);
  if (installedSkillNames.length) {
    add(
      'Installed GodotBuddy skills',
      missingInstalledSkills.length === 0,
      missingInstalledSkills.length ? `missing: ${missingInstalledSkills.join(', ')}` : `${installedSkillNames.length} skills in ${codexHome}`
    );
  } else {
    add('Installed GodotBuddy skills', false, 'run godotbuddy setup or install-skills', 'optional');
  }
  add('Godot project file', fs.existsSync(path.join(root, 'project.godot')), path.join(root, 'project.godot'), 'optional');
  const addons = fs.existsSync(path.join(root, 'addons', 'godotbuddy'));
  add('Godot editor addon installed', addons, path.join(root, 'addons', 'godotbuddy'), 'optional');
  return checks;
}
