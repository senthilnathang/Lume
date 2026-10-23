// Render the local user-service unit without copying secrets into it.
const fs = require('node:fs');
const path = require('node:path');
const backend = path.resolve(__dirname, '..');
const node = process.execPath;
if (Number(process.versions.node.split('.')[0]) < 20) throw new Error('Node 20+ is required');
// Keep the generated systemd directives unambiguous.
if ([backend, node].some(value => /[\s%\n\r]/.test(value))) throw new Error('Service paths must not contain whitespace or percent signs');
process.stdout.write(fs.readFileSync(path.join(backend, 'deploy/lume-nestjs.service.in'), 'utf8')
  .replaceAll('@BACKEND_DIR@', backend).replaceAll('@NODE@', node));
