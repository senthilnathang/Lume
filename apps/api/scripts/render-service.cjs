// Render the local user-service unit without copying secrets into it.
const fs = require('node:fs');
const path = require('node:path');
const backend = path.resolve(__dirname, '..');
const node = process.execPath;
const [major, minor] = process.versions.node.split('.').map(Number);
if (major < 22 || (major === 22 && minor < 12)) throw new Error('Node 22.12+ is required');
// Keep the generated systemd directives unambiguous.
if ([backend, node].some(value => /[\s%\n\r]/.test(value))) throw new Error('Service paths must not contain whitespace or percent signs');
process.stdout.write(fs.readFileSync(path.join(backend, 'deploy/lume-nestjs.service.in'), 'utf8')
  .replaceAll('@BACKEND_DIR@', backend).replaceAll('@NODE@', node));
