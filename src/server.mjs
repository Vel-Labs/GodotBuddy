import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { URL } from 'node:url';
import { packageRoot, repoRoot, hubPath, runDir, readJson, loadRun, saveRun, moveTask, personalizeStylePack, qaSpriteAssets, promoteStylePack, ensureDir, loadMoodboard, addMoodboardReference, updateMoodboardReference } from './core.mjs';

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8'
};

function send(res, code, body, type = 'text/plain; charset=utf-8') {
  res.writeHead(code, { 'Content-Type': type, 'Cache-Control': 'no-store' });
  res.end(body);
}

function sendJson(res, data, code = 200) {
  send(res, code, JSON.stringify(data, null, 2), 'application/json; charset=utf-8');
}

function safeJoin(base, rel) {
  const target = path.resolve(base, rel || '.');
  if (!target.startsWith(path.resolve(base))) throw new Error('Path escapes run directory');
  return target;
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', chunk => {
      data += chunk;
      if (data.length > 15_000_000) reject(new Error('Body too large'));
    });
    req.on('end', () => resolve(data));
    req.on('error', reject);
  });
}

export function startServer({ root = repoRoot(), run = null, host = '127.0.0.1', port = 41737 } = {}) {
  root = path.resolve(root);
  const webRoot = path.join(packageRoot(), 'apps', 'web');

  const server = http.createServer(async (req, res) => {
    try {
      const u = new URL(req.url, `http://${req.headers.host}`);
      const pathname = u.pathname;

      if (pathname === '/api/hub') {
        return sendJson(res, readJson(hubPath(root), { runs: [], active_run: null }));
      }

      if (pathname === '/api/state') {
        const slug = u.searchParams.get('run') || run;
        const state = loadRun(root, slug);
        return sendJson(res, state || { error: 'No run found' }, state ? 200 : 404);
      }

      if (pathname === '/api/moodboard') {
        return sendJson(res, loadMoodboard(root));
      }

      if (pathname === '/api/move-task' && req.method === 'POST') {
        const body = JSON.parse(await readBody(req) || '{}');
        const task = moveTask({ root, slug: body.run || run, taskId: body.taskId, lane: body.lane });
        return sendJson(res, { ok: true, task });
      }

      if (pathname === '/api/update-task' && req.method === 'POST') {
        const body = JSON.parse(await readBody(req) || '{}');
        const state = loadRun(root, body.run || run);
        if (!state) return sendJson(res, { error: 'No run found' }, 404);
        const task = state.tasks.find(t => t.id === body.taskId);
        if (!task) return sendJson(res, { error: 'Task not found' }, 404);
        Object.assign(task, body.patch || {}, { updated_at: new Date().toISOString() });
        saveRun(root, state);
        return sendJson(res, { ok: true, task });
      }

      if (pathname === '/api/personalize' && req.method === 'POST') {
        const body = JSON.parse(await readBody(req) || '{}');
        const refs = [];
        const uploadDir = path.join(root, '.godotbuddy', 'uploads', 'references');
        ensureDir(uploadDir);
        for (const ref of body.references || []) {
          if (!ref.name || !ref.data) continue;
          const cleanName = path.basename(ref.name).replace(/[^a-zA-Z0-9._-]+/g, '-');
          const data = String(ref.data).includes(',') ? String(ref.data).split(',').pop() : String(ref.data);
          const dest = path.join(uploadDir, cleanName);
          fs.writeFileSync(dest, Buffer.from(data, 'base64'));
          refs.push(dest);
        }
        const pack = personalizeStylePack({
          root,
          name: body.name,
          description: body.description || '',
          artStyle: body.artStyle || 'custom',
          spriteScale: body.spriteScale || '64x64',
          references: refs,
          force: Boolean(body.force)
        });
        return sendJson(res, { ok: true, pack: { slug: pack.slug, path: pack.dir } });
      }

      if (pathname === '/api/moodboard-reference' && req.method === 'POST') {
        const body = JSON.parse(await readBody(req) || '{}');
        const uploadDir = path.join(root, '.godotbuddy', 'uploads', 'moodboard');
        ensureDir(uploadDir);
        let file = body.file;
        if (body.data && body.name) {
          const cleanName = path.basename(body.name).replace(/[^a-zA-Z0-9._-]+/g, '-');
          const data = String(body.data).includes(',') ? String(body.data).split(',').pop() : String(body.data);
          file = path.join(uploadDir, cleanName);
          fs.writeFileSync(file, Buffer.from(data, 'base64'));
        }
        const ref = addMoodboardReference({
          root,
          file,
          title: body.title,
          notes: body.notes || '',
          tags: body.tags || [],
          useFor: body.useFor || '',
          avoid: body.avoid || '',
          weight: body.weight || 3
        });
        return sendJson(res, { ok: true, reference: ref, moodboard: loadMoodboard(root) });
      }

      if (pathname === '/api/moodboard-note' && req.method === 'POST') {
        const body = JSON.parse(await readBody(req) || '{}');
        const ref = updateMoodboardReference({
          root,
          id: body.id,
          patch: {
            title: body.title,
            notes: body.notes,
            tags: body.tags,
            use_for: body.useFor,
            avoid: body.avoid,
            weight: body.weight
          }
        });
        return sendJson(res, { ok: true, reference: ref, moodboard: loadMoodboard(root) });
      }

      if (pathname === '/api/qa' && req.method === 'POST') {
        const body = JSON.parse(await readBody(req) || '{}');
        const report = qaSpriteAssets({ root, slug: body.run || run });
        return sendJson(res, { ok: true, report });
      }

      if (pathname === '/api/promote-style-pack' && req.method === 'POST') {
        const body = JSON.parse(await readBody(req) || '{}');
        const promoted = promoteStylePack({ root, slug: body.slug, dest: body.dest, force: Boolean(body.force) });
        return sendJson(res, { ok: true, promoted });
      }

      if (pathname === '/file') {
        const slug = u.searchParams.get('run') || run;
        const rel = u.searchParams.get('path') || '';
        const dir = runDir(root, slug);
        const file = safeJoin(dir, rel);
        if (!fs.existsSync(file) || !fs.statSync(file).isFile()) return send(res, 404, 'not found');
        const ext = path.extname(file).toLowerCase();
        res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream', 'Cache-Control': 'no-store' });
        fs.createReadStream(file).pipe(res);
        return;
      }

      if (pathname === '/workspace-file') {
        const rel = u.searchParams.get('path') || '';
        const file = safeJoin(root, rel);
        if (!fs.existsSync(file) || !fs.statSync(file).isFile()) return send(res, 404, 'not found');
        const ext = path.extname(file).toLowerCase();
        res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream', 'Cache-Control': 'no-store' });
        fs.createReadStream(file).pipe(res);
        return;
      }

      let file = pathname === '/' ? path.join(webRoot, 'index.html') : safeJoin(webRoot, pathname.slice(1));
      if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');
      if (!fs.existsSync(file) || !fs.statSync(file).isFile()) return send(res, 404, 'not found');
      const ext = path.extname(file).toLowerCase();
      res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream', 'Cache-Control': 'no-store' });
      fs.createReadStream(file).pipe(res);
    } catch (err) {
      sendJson(res, { error: err.message }, 500);
    }
  });

  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, host, () => {
      resolve({ server, url: `http://${host}:${port}/`, root, run });
    });
  });
}
