/**
 * PM2 process configuration for production.
 *
 * Why pm2:
 *   `node src/index.js` direct runs as a single thread on a single core
 *   and dies on any unhandled exception. Production needs supervision +
 *   cluster mode to fan out across CPUs without code changes.
 *
 * Usage:
 *   pm2 start ecosystem.config.cjs --env production
 *   pm2 logs lume-backend
 *   pm2 reload lume-backend         # zero-downtime restart
 *   pm2 stop lume-backend
 *   pm2 startup                     # generate systemd unit
 *   pm2 save                        # persist current state for autostart
 *
 * Cluster mode:
 *   instances: 'max' uses one worker per CPU. For deployments with
 *   <2 GB memory per CPU, override with `instances: 2` or fewer; pm2
 *   doesn't enforce a per-worker memory limit by default.
 *
 * NODE_OPTIONS:
 *   --max-old-space-size=2048   2 GB heap per worker. Default V8 cap
 *                                is ~1.5 GB on 64-bit; bump for
 *                                module-loading + Drizzle query result
 *                                sets that can briefly spike.
 *   --enable-source-maps        Stack traces map back to source even
 *                                with tsx/esbuild transformations.
 */

module.exports = {
  apps: [
    {
      name: 'lume-backend',
      script: 'src/index.js',
      cwd: __dirname,

      // Cluster across all CPUs in production; single-process in staging
      // so logs are easier to read.
      instances: 'max',
      exec_mode: 'cluster',

      // 2 GB heap per worker + source maps; see header comment.
      node_args: '--max-old-space-size=2048 --enable-source-maps',

      // Restart policy
      max_restarts: 10,
      min_uptime: '15s',         // a process that dies in <15s is "crashing"
      max_memory_restart: '1500M',// preempt OOM by reloading at 1.5 GB RSS
      kill_timeout: 5000,         // SIGTERM grace before SIGKILL
      wait_ready: false,          // we don't currently emit process.send('ready')
      listen_timeout: 30000,      // 30s to bind port 3000 before pm2 forces a restart

      // Logs — keep stdout/stderr separate so journald-style scrapers
      // can colour them; pm2 timestamps every line.
      log_date_format: 'YYYY-MM-DD HH:mm:ss.SSS Z',
      out_file: './logs/pm2-out.log',
      error_file: './logs/pm2-err.log',
      combine_logs: false,
      merge_logs: false,

      // Default env — apply with `pm2 start ecosystem.config.cjs`.
      env: {
        NODE_ENV: 'production',
        PORT: '3000',
        // Performance defaults documented in CLAUDE.md / docs/ARCHITECTURE.md.
        // Override per-host with shell env or pm2 --env.
        DB_LOGGING: 'false',
        LOG_LEVEL: 'info',
        OTEL_TRACES_SAMPLER_ARG: '0.1',
        // Promote table-parity WARNING into a startup failure: better to
        // crash-loop noisily than serve 500s on missing module tables.
        LUME_STRICT_TABLE_PARITY: 'true',
      },

      // `--env staging` for non-prod deployments. Lower trace sampling
      // wouldn't help here (already low); keep single instance for
      // easier log inspection.
      env_staging: {
        NODE_ENV: 'staging',
        PORT: '3000',
        DB_LOGGING: 'false',
        LOG_LEVEL: 'info',
        OTEL_TRACES_SAMPLER_ARG: '0.1',
        instances: 1,
        exec_mode: 'fork',
      },

      // Hot reload mode (NOT recommended for prod — pm2's `watch` polls
      // the disk on a timer). Use `pm2 reload` after a deploy instead.
      watch: false,
      ignore_watch: ['node_modules', 'logs', 'uploads', '.git'],
    },
  ],

  /**
   * Optional remote deploy block. Configure once with `pm2 deploy
   * ecosystem.config.cjs production setup`, then deploy with
   * `pm2 deploy ecosystem.config.cjs production`.
   *
   * Left commented because hostnames are deployment-specific.
   */
  // deploy: {
  //   production: {
  //     user: 'lume',
  //     host: ['lume.example.com'],
  //     ref: 'origin/main',
  //     repo: 'git@github.com:senthilnathang/Lume.git',
  //     path: '/var/www/lume',
  //     'post-deploy': 'cd backend && npm ci --omit=dev && npx prisma generate && pm2 reload ecosystem.config.cjs --env production',
  //   },
  // },
};
