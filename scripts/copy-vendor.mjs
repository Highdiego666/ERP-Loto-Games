import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const vendor = path.join(root, 'vendor');

function copyFile(from, to) {
  fs.mkdirSync(path.dirname(to), { recursive: true });
  fs.copyFileSync(path.join(root, from), path.join(root, to));
}

function copyDir(from, to) {
  fs.mkdirSync(path.join(root, to), { recursive: true });
  fs.cpSync(path.join(root, from), path.join(root, to), { recursive: true });
}

fs.rmSync(vendor, { recursive: true, force: true });
fs.mkdirSync(vendor, { recursive: true });

copyFile('node_modules/@fortawesome/fontawesome-free/css/all.min.css', 'vendor/fontawesome/css/all.min.css');
copyDir('node_modules/@fortawesome/fontawesome-free/webfonts', 'vendor/fontawesome/webfonts');
copyFile('node_modules/chart.js/dist/chart.umd.js', 'vendor/chart.umd.js');
copyFile('node_modules/jsbarcode/dist/JsBarcode.all.min.js', 'vendor/JsBarcode.all.min.js');
copyFile('node_modules/@supabase/supabase-js/dist/umd/supabase.js', 'vendor/supabase.js');

console.log('✅ Dependencias web copiadas a vendor/ para ejecución sin Internet');
