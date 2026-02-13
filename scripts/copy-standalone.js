/**
 * After next build (standalone), copy static and public into standalone output.
 * Required for Next.js standalone deployment.
 */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const standaloneDir = path.join(root, '.next', 'standalone');
const staticSrc = path.join(root, '.next', 'static');
const staticDst = path.join(standaloneDir, '.next', 'static');
const publicSrc = path.join(root, 'public');
const publicDst = path.join(standaloneDir, 'public');

if (!fs.existsSync(standaloneDir)) {
  console.warn('scripts/copy-standalone: .next/standalone not found (run npm run build first)');
  process.exit(0);
}

function copyRecursive(src, dst) {
  if (!fs.existsSync(src)) return;
  fs.mkdirSync(dst, { recursive: true });
  for (const name of fs.readdirSync(src)) {
    const s = path.join(src, name);
    const d = path.join(dst, name);
    if (fs.statSync(s).isDirectory()) {
      copyRecursive(s, d);
    } else {
      fs.mkdirSync(path.dirname(d), { recursive: true });
      fs.copyFileSync(s, d);
    }
  }
}

if (fs.existsSync(staticSrc)) {
  copyRecursive(staticSrc, staticDst);
  console.log('Copied .next/static to standalone');
}
if (fs.existsSync(publicSrc)) {
  copyRecursive(publicSrc, publicDst);
  console.log('Copied public to standalone');
}
