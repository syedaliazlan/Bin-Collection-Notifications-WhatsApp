/**
 * Hostinger / LiteSpeed Node.js entry point.
 * Next.js standalone puts server.js in .next/standalone/; this file runs that
 * so the host can keep using "node server.js" from the app root.
 */
const path = require('path');
const standaloneDir = path.join(__dirname, '.next', 'standalone');
const serverPath = path.join(standaloneDir, 'server.js');

try {
  process.chdir(standaloneDir);
  require(serverPath);
} catch (err) {
  console.error('Failed to start Next.js standalone server:', err.message);
  if (err.code === 'MODULE_NOT_FOUND' || err.code === 'ENOENT') {
    console.error('Run "npm run build" first. Ensure .next/standalone exists.');
  }
  process.exit(1);
}
