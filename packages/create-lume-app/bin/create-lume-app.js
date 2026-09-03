#!/usr/bin/env node
import { mkdirSync, existsSync } from 'fs';
import { resolve } from 'path';
import { planModule, buildModuleFiles, writeModule } from '../src/generate.js';
import { listTemplates } from '../src/templates.js';

function usage() {
  console.log('Usage: create-lume-app <module-name> [--label "Display Name"] [--fields name:type,...] [--template name] [--dir path]');
  console.log('');
  console.log('Templates:');
  for (const t of listTemplates()) {
    console.log(`  ${t.name} — ${t.label}: ${t.description}`);
  }
  console.log('');
  console.log('Examples:');
  console.log('  create-lume-app deals --template crm-pipeline');
  console.log('  create-lume-app grants --label Grants --fields title:text,amount:currency,deadline:date');
  console.log('  create-lume-app inventory --dir ./backend/src/modules');
  console.log('  create-lume-app --list-templates');
}

function parseArgs(argv) {
  const args = { fields: [], dir: resolve(process.cwd(), 'backend/src/modules') };
  const positional = [];
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '--label') {
      args.label = argv[++i];
    } else if (a === '--fields') {
      args.fields = String(argv[++i] || '').split(',').map((s) => s.trim()).filter(Boolean);
    } else if (a === '--template') {
      args.template = argv[++i];
    } else if (a === '--dir') {
      args.dir = resolve(process.cwd(), argv[++i]);
    } else if (a === '--list-templates') {
      for (const t of listTemplates()) {
        console.log(`${t.name}: ${t.label} (${t.fields.join(', ')})`);
      }
      process.exit(0);
    } else if (a === '--help' || a === '-h') {
      usage();
      process.exit(0);
    } else if (a.startsWith('-')) {
      console.error(`Unknown flag: ${a}`);
      usage();
      process.exit(1);
    } else {
      positional.push(a);
    }
  }
  [args.name] = positional;
  return args;
}

const args = parseArgs(process.argv.slice(2));
if (!args.name) {
  usage();
  process.exit(1);
}

const plan = planModule({ name: args.name, label: args.label, fieldSpecs: args.fields, template: args.template });
const targetDir = resolve(args.dir, plan.technicalName);
if (existsSync(targetDir)) {
  console.error(`Refusing to overwrite existing directory: ${targetDir}`);
  process.exit(1);
}
mkdirSync(targetDir, { recursive: true });
const written = writeModule(targetDir, buildModuleFiles(plan));
console.log(`Created ${plan.title} module at ${targetDir} (${written.length} files)`);
console.log('Next: run `node src/scripts/setupDrizzle.js` from backend/ to create tables.');
