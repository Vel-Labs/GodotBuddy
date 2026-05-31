import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'godotbuddy-package-smoke-'));
const installDir = path.join(tmp, 'install');
const projectDir = path.join(tmp, 'game');
const codexHome = path.join(tmp, 'codex-home');

fs.mkdirSync(installDir, { recursive: true });
fs.mkdirSync(projectDir, { recursive: true });

const packOutput = execFileSync('npm', ['pack', '--json'], { cwd: root, encoding: 'utf8' });
const packed = JSON.parse(packOutput)[0];
const tarball = path.join(root, packed.filename);

try {
  execFileSync('npm', ['init', '-y'], { cwd: installDir, stdio: 'ignore' });
  execFileSync('npm', ['install', tarball], { cwd: installDir, stdio: 'ignore' });
  const bin = path.join(installDir, 'node_modules', '.bin', 'godotbuddy');

  execFileSync(bin, [
    'quickstart',
    '--root', projectDir,
    '--project-name', 'Smoke Game',
    '--goal', 'Build smoke-test slice',
    '--codex-home', codexHome,
    '--open', 'false'
  ], { cwd: projectDir, stdio: 'inherit' });

  execFileSync(bin, ['qa', '--root', projectDir], { cwd: projectDir, stdio: 'inherit' });

  const manifest = path.join(projectDir, '.godotbuddy', 'install-manifest.json');
  const styleLeak = path.join(codexHome, 'skills', 'personal-style-sprite-generator');
  if (!fs.existsSync(manifest)) throw new Error('Missing install manifest after quickstart.');
  if (fs.existsSync(styleLeak)) throw new Error('Personal style pack leaked into default install.');

  console.log(`Package smoke passed: ${packed.filename}`);
} finally {
  if (fs.existsSync(tarball)) fs.rmSync(tarball, { force: true });
}
