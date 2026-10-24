const path = require('node:path');
module.exports = { apps: [{
  name: 'lume-api', cwd: path.join(__dirname, 'apps/api'), script: 'dist/main.js',
  node_args: '--env-file=.env --enable-source-maps', instances: 1, exec_mode: 'fork',
  autorestart: true, max_restarts: 10, min_uptime: '15s', kill_timeout: 90000,
  env: { NODE_ENV: 'production', HOST: '127.0.0.1', PORT: '3000',
    AUTOMATION_WORKER_ENABLED: 'false', AUTOMATION_DURABLE_EVENTS: 'false' },
}] };
