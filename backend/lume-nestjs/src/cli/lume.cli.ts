#!/usr/bin/env node

import * as yargs from 'yargs';
import { EntityGenerator } from './generators/entity.generator';
import { ModuleGenerator } from './generators/module.generator';
import { WorkflowGenerator } from './generators/workflow.generator';
import { PluginGenerator } from './generators/plugin.generator';

const entityGenerator = new EntityGenerator();
const moduleGenerator = new ModuleGenerator();
const workflowGenerator = new WorkflowGenerator();
const pluginGenerator = new PluginGenerator();

yargs
  .command(
    'generate:entity <name>',
    'Generate a new entity',
    (yargs) =>
      yargs
        .positional('name', { describe: 'Entity name', type: 'string' })
        .option('fields', { describe: 'Fields as JSON', type: 'string' })
        .option('description', { describe: 'Entity description', type: 'string' })
        .option('hooks', { describe: 'Include lifecycle hooks', type: 'boolean' }),
    (argv) => {
      const fields = argv.fields ? JSON.parse(argv.fields) : undefined;
      entityGenerator.generate(
        {
          name: argv.name as string,
          fields,
          description: argv.description as string,
          withHooks: argv.hooks as boolean,
        },
        './src/modules',
      );
      console.log('\n✓ Entity generated successfully!');
    },
  )
  .command(
    'generate:module <name>',
    'Generate a new module',
    (yargs) =>
      yargs
        .positional('name', { describe: 'Module name', type: 'string' })
        .option('description', { describe: 'Module description', type: 'string' })
        .option('depends', { describe: 'Dependencies as comma-separated list', type: 'string' })
        .option('entities', { describe: 'Number of example entities', type: 'number', default: 1 })
        .option('workflows', { describe: 'Include example workflows', type: 'boolean', default: false }),
    (argv) => {
      const depends = argv.depends ? (argv.depends as string).split(',').map(d => d.trim()) : undefined;
      moduleGenerator.generate(
        {
          name: argv.name as string,
          description: argv.description as string,
          depends,
          withEntities: argv.entities as number,
          withWorkflows: argv.workflows as boolean,
        },
        './src/modules',
      );
      console.log('\n✓ Module generated successfully!');
    },
  )
  .command(
    'generate:workflow <name>',
    'Generate a new workflow',
    (yargs) =>
      yargs
        .positional('name', { describe: 'Workflow name', type: 'string' })
        .option('entity', { describe: 'Target entity', type: 'string', required: true })
        .option('trigger', {
          describe: 'Trigger type',
          type: 'string',
          choices: ['create', 'update', 'delete', 'schedule'],
          default: 'create',
        }),
    (argv) => {
      workflowGenerator.generate(
        {
          name: argv.name as string,
          entity: argv.entity as string,
          trigger: argv.trigger as 'create' | 'update' | 'delete' | 'schedule',
        },
        './src/modules',
      );
      console.log('\n✓ Workflow generated successfully!');
    },
  )
  .command(
    'generate:plugin <name>',
    'Generate a new plugin',
    (yargs) =>
      yargs
        .positional('name', { describe: 'Plugin name', type: 'string' })
        .option('displayName', { describe: 'Display name', type: 'string' })
        .option('author', { describe: 'Plugin author', type: 'string', required: true })
        .option('description', { describe: 'Plugin description', type: 'string' })
        .option('depends', { describe: 'Dependencies as JSON', type: 'string' }),
    (argv) => {
      const dependencies = argv.depends ? JSON.parse(argv.depends as string) : undefined;
      pluginGenerator.generate(
        {
          name: argv.name as string,
          displayName: argv.displayName as string,
          author: argv.author as string,
          description: argv.description as string,
          dependencies,
        },
        './src/modules/plugins',
      );
      console.log('\n✓ Plugin generated successfully!');
    },
  )
  .help()
  .alias('help', 'h')
  .version()
  .alias('version', 'v')
  .demandCommand()
  .strict()
  .parse();
