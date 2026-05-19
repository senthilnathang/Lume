/**
 * Prisma seed entry point.
 *
 * Delegates to the canonical setup scripts that match the current schema:
 *   - src/scripts/createAdmin.js  → super_admin role + admin user
 *   - src/scripts/seedData.js     → sample activities/team/messages/settings
 *
 * Invoked by Prisma when `npx prisma db seed` runs (configured via the
 * `prisma.seed` key in package.json). We keep this file as a thin shim so
 * `npm run db:seed` works out of the box, but the seeding logic lives in the
 * scripts above. The previous in-file logic referenced removed fields
 * (`username`, string-typed `role`, `Organization`, `Programme`,
 * `TeamMember`) and would fail on the first upsert against the current
 * schema. Single source of truth is now src/scripts/.
 *
 * Run directly for ad-hoc seeding:
 *   node prisma/seed.js
 *
 * Override admin creds via env vars (see src/scripts/createAdmin.js):
 *   ADMIN_EMAIL=ops@example.com ADMIN_PASSWORD='Strong!Pass1' node prisma/seed.js
 */

import dotenv from 'dotenv';
dotenv.config();

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SCRIPTS_DIR = path.join(__dirname, '..', 'src', 'scripts');

function runScript(name) {
  return new Promise((resolve, reject) => {
    const scriptPath = path.join(SCRIPTS_DIR, name);
    const child = spawn(process.execPath, [scriptPath], {
      stdio: 'inherit',
      env: process.env,
    });
    child.on('exit', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${name} exited with code ${code}`));
    });
    child.on('error', reject);
  });
}

async function main() {
  console.log('🌱 Prisma seed — delegating to canonical setup scripts\n');

  console.log('━━━ Step 1: createAdmin.js ━━━');
  await runScript('createAdmin.js');

  console.log('\n━━━ Step 2: seedData.js ━━━');
  await runScript('seedData.js');

  console.log('\n✅ Seed complete.');
}

main().catch((err) => {
  console.error('\n❌ Seed failed:', err.message);
  process.exit(1);
});
