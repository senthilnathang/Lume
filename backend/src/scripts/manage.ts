#!/usr/bin/env ts-node
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';

const LUME_ROOT = path.resolve(__dirname, '../../../../');
const BACKEND_DIR = path.join(LUME_ROOT, 'backend');
const DEMO_DATA_DIR = path.join(BACKEND_DIR, 'demo_data');

const commands = {
  runserver: 'Run the Lume backend server',
  shell: 'Start an interactive Python shell',
  initdb: 'Initialize the database',
  resetdb: 'Reset the database (drops and recreates)',
  createsuperuser: 'Create a superuser account',
  createuser: 'Create a regular user account',
  listusers: 'List all user accounts',
  module: 'Manage modules (list, install, uninstall)',
  test: 'Run the test suite',
  lint: 'Run linter',
  typecheck: 'Run TypeScript type checker',
  help: 'Show this help message',
};

async function runCommand(
  cmd: string,
  args: string[],
  options: { cwd?: string; env?: NodeJS.ProcessEnv } = {}
): Promise<void> {
  return new Promise((resolve, reject) => {
    const proc = spawn(cmd, args, {
      stdio: 'inherit',
      shell: true,
      ...options,
    });

    proc.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`Command exited with code ${code}`));
    });

    proc.on('error', reject);
  });
}

async function runServer(): Promise<void> {
  console.log('Starting Lume backend server...');
  const serverPath = path.join(BACKEND_DIR, 'src', 'index.js');
  runCommand('node', [serverPath], { cwd: BACKEND_DIR });
}

async function runShell(): Promise<void> {
  console.log('Starting Python shell...');
  runCommand('python3', ['-i'], { cwd: BACKEND_DIR });
}

async function initDatabase(seedData: boolean = false): Promise<void> {
  console.log('Initializing database...');
  const dbPath = path.join(BACKEND_DIR, 'src', 'db.js');
  const args = seedData ? [dbPath, '--seed'] : [dbPath];
  runCommand('node', args, { cwd: BACKEND_DIR });
}

async function resetDatabase(): Promise<void> {
  console.log('Resetting database...');
  const dbPath = path.join(BACKEND_DIR, 'src', 'db.js');
  runCommand('node', [dbPath, '--reset'], { cwd: BACKEND_DIR });
}

async function createSuperuser(
  username: string,
  email: string,
  password: string
): Promise<void> {
  console.log(`Creating superuser: ${username}`);
  const userPath = path.join(BACKEND_DIR, 'src', 'scripts', 'createUser.js');
  runCommand('node', [userPath, username, email, password, '--superuser'], {
    cwd: BACKEND_DIR,
  });
}

async function createUser(
  username: string,
  email: string,
  password: string,
  role?: string
): Promise<void> {
  console.log(`Creating user: ${username}`);
  const userPath = path.join(BACKEND_DIR, 'src', 'scripts', 'createUser.js');
  const args = role
    ? [userPath, username, email, password, '--role', role]
    : [userPath, username, email, password];
  runCommand('node', args, { cwd: BACKEND_DIR });
}

async function listUsers(): Promise<void> {
  console.log('Listing all users...');
  const userPath = path.join(BACKEND_DIR, 'src', 'scripts', 'listUsers.js');
  runCommand('node', [userPath], { cwd: BACKEND_DIR });
}

async function listModules(): Promise<void> {
  console.log('Available modules:');
  const modulesDir = path.join(BACKEND_DIR, 'src', 'modules');
  if (fs.existsSync(modulesDir)) {
    const modules = fs.readdirSync(modulesDir);
    modules.forEach((mod) => {
      const manifestPath = path.join(modulesDir, mod, '__manifest__.js');
      let state = 'uninstalled';
      if (fs.existsSync(manifestPath)) {
        try {
          const manifest = require(manifestPath);
          state = manifest.state || 'installed';
        } catch (e) {
          state = 'unknown';
        }
      }
      console.log(`  - ${mod} [${state}]`);
    });
  } else {
    console.log('  No modules found.');
  }
}

async function installModule(moduleName: string): Promise<void> {
  console.log(`Installing module: ${moduleName}`);
  const modulePath = path.join(BACKEND_DIR, 'src', 'modules', moduleName);
  if (fs.existsSync(modulePath)) {
    const installScript = path.join(modulePath, 'install.js');
    if (fs.existsSync(installScript)) {
      runCommand('node', [installScript], { cwd: BACKEND_DIR });
    } else {
      console.log(`No install script found for ${moduleName}`);
    }
  } else {
    console.error(`Module ${moduleName} not found`);
  }
}

async function uninstallModule(moduleName: string): Promise<void> {
  console.log(`Uninstalling module: ${moduleName}`);
  const modulePath = path.join(BACKEND_DIR, 'src', 'modules', moduleName);
  if (fs.existsSync(modulePath)) {
    const uninstallScript = path.join(modulePath, 'uninstall.js');
    if (fs.existsSync(uninstallScript)) {
      runCommand('node', [uninstallScript], { cwd: BACKEND_DIR });
    } else {
      console.log(`No uninstall script found for ${moduleName}`);
    }
  } else {
    console.error(`Module ${moduleName} not found`);
  }
}

async function runTests(): Promise<void> {
  console.log('Running tests...');
  runCommand('npx', ['jest'], { cwd: BACKEND_DIR });
}

async function runLint(): Promise<void> {
  console.log('Running linter...');
  runCommand('npx', ['eslint', 'src/'], { cwd: BACKEND_DIR });
}

async function runTypeCheck(): Promise<void> {
  console.log('Running type checker...');
  runCommand('npx', ['tsc', '--noEmit'], { cwd: BACKEND_DIR });
}

async function loadDemoData(): Promise<void> {
  console.log('Loading demo data...');
  const demoDataPath = path.join(DEMO_DATA_DIR, 'lume_demo_data.json');
  if (fs.existsSync(demoDataPath)) {
    const loaderPath = path.join(BACKEND_DIR, 'src', 'scripts', 'loadDemoData.js');
    runCommand('node', [loaderPath, demoDataPath], { cwd: BACKEND_DIR });
  } else {
    console.error('Demo data file not found');
  }
}

const argv = yargs(hideBin(process.argv))
  .command('runserver', commands.runserver, async () => {
    await runServer();
  })
  .command('shell', commands.shell, async () => {
    await runShell();
  })
  .command(
    'initdb',
    commands.initdb,
    (yargs) =>
      yargs.option('seed', {
        alias: 's',
        type: 'boolean',
        description: 'Seed database with demo data',
      }),
    async (argv) => {
      await initDatabase(argv.seed as boolean);
    }
  )
  .command('resetdb', commands.resetdb, async () => {
    await resetDatabase();
  })
  .command(
    'createsuperuser',
    commands.createsuperuser,
    (yargs) =>
      yargs
        .option('username', { alias: 'u', type: 'string', demandOption: true })
        .option('email', { alias: 'e', type: 'string', demandOption: true })
        .option('password', { alias: 'p', type: 'string', demandOption: true }),
    async (argv) => {
      await createSuperuser(
        argv.username as string,
        argv.email as string,
        argv.password as string
      );
    }
  )
  .command(
    'createuser',
    commands.createuser,
    (yargs) =>
      yargs
        .option('username', { alias: 'u', type: 'string', demandOption: true })
        .option('email', { alias: 'e', type: 'string', demandOption: true })
        .option('password', { alias: 'p', type: 'string', demandOption: true })
        .option('role', { alias: 'r', type: 'string' }),
    async (argv) => {
      await createUser(
        argv.username as string,
        argv.email as string,
        argv.password as string,
        argv.role as string | undefined
      );
    }
  )
  .command('listusers', commands.listusers, async () => {
    await listUsers();
  })
  .command(
    'module',
    commands.module,
    (yargs) =>
      yargs
        .command('list', 'List all modules', async () => {
          await listModules();
        })
        .command(
          'install',
          'Install a module',
          (yargs) =>
            yargs.option('name', { alias: 'n', type: 'string', demandOption: true }),
          async (argv) => {
            await installModule(argv.name as string);
          }
        )
        .command(
          'uninstall',
          'Uninstall a module',
          (yargs) =>
            yargs.option('name', { alias: 'n', type: 'string', demandOption: true }),
          async (argv) => {
            await uninstallModule(argv.name as string);
          }
        ),
    async () => {
      await listModules();
    }
  )
  .command('test', commands.test, async () => {
    await runTests();
  })
  .command('lint', commands.lint, async () => {
    await runLint();
  })
  .command('typecheck', commands.typecheck, async () => {
    await runTypeCheck();
  })
  .command(
    'loaddemodata',
    'Load demo data into database',
    async () => {
      await loadDemoData();
    }
  )
  .command('help', commands.help, async () => {
    console.log('Lume Framework Management Commands:');
    Object.entries(commands).forEach(([cmd, desc]) => {
      console.log(`  ${cmd.padEnd(20)} ${desc}`);
    });
  })
  .demandCommand(1, 'You must provide a command')
  .strict()
  .help(false).argv;
