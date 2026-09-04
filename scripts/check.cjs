'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const root = path.resolve(__dirname, '..');
const failures = [];

function walk(dir) {
  const full = path.join(root, dir);
  if (!fs.existsSync(full)) return [];
  const output = [];
  for (const entry of fs.readdirSync(full, { withFileTypes: true })) {
    const rel = path.join(dir, entry.name);
    if (entry.isDirectory()) output.push(...walk(rel));
    else output.push(rel);
  }
  return output;
}

const codeFiles = [...walk('js'), ...walk('electron'), ...walk('scripts')]
  .filter(file => /\.(?:js|cjs)$/.test(file));

for (const file of codeFiles) {
  const result = spawnSync(process.execPath, ['--check', path.join(root, file)], { encoding: 'utf8' });
  if (result.status !== 0) failures.push(`${file}: ${result.stderr || result.stdout}`);
}

const required = [
  'index.html',
  'css/style.css',
  'assets/img/loto-games-logo.svg',
  'build/icon.ico',
  'electron/main.cjs',
  'electron/preload.cjs',
  'electron/local-db.cjs',
  'electron/cloud-sync.cjs',
  'js/desktop-runtime.js'
];
for (const file of required) {
  if (!fs.existsSync(path.join(root, file))) failures.push(`Falta archivo requerido: ${file}`);
}

const indexPath = path.join(root, 'index.html');
if (fs.existsSync(indexPath)) {
  const index = fs.readFileSync(indexPath, 'utf8');
  for (const forbidden of ['cdn.jsdelivr.net', 'cdnjs.cloudflare.com', 'fonts.googleapis.com']) {
    if (index.includes(forbidden)) failures.push(`index.html todavía depende de CDN remoto: ${forbidden}`);
  }
  if (!index.includes("window.LOTO_VERSION = '1.2.0'")) failures.push('Versión 1.2.0 no encontrada en index.html.');
}

if (failures.length) {
  console.error(failures.join('\n\n'));
  process.exit(1);
}

console.log(`OK: ${codeFiles.length} archivos JavaScript validados y assets de release presentes.`);
