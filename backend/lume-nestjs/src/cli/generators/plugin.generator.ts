import * as fs from 'fs';
import * as path from 'path';

export interface PluginGeneratorOptions {
  name: string;
  displayName?: string;
  author: string;
  description?: string;
  dependencies?: Record<string, string>;
}

export class PluginGenerator {
  generate(options: PluginGeneratorOptions, basePath: string = './src/modules/plugins'): void {
    const pluginName = this.toKebabCase(options.name);
    const pluginPath = path.join(basePath, pluginName);

    // Create directory structure
    this.createDirectories(pluginPath);

    // Create plugin manifest
    this.createPluginManifest(options, pluginPath);

    // Create migration files
    this.createMigrations(pluginPath);

    // Create index file
    this.createIndexFile(options, pluginPath);

    console.log(`✓ Created plugin: ${pluginPath}`);
    console.log(`  - Plugin manifest`);
    console.log(`  - Migration files`);
    console.log(`  - Index entry point`);
  }

  private createDirectories(pluginPath: string): void {
    const dirs = ['src', 'dist', 'migrations', 'entities', 'workflows'];
    for (const dir of dirs) {
      const dirPath = path.join(pluginPath, dir);
      if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
      }
    }
  }

  private createPluginManifest(options: PluginGeneratorOptions, pluginPath: string): void {
    const pluginName = path.basename(pluginPath);
    const pascalName = this.toPascalCase(pluginName);
    const dbPrefix = `${pluginName}_`;

    const dependencies = options.dependencies
      ? Object.entries(options.dependencies)
          .map(([name, version]) => `    "${name}": "${version}"`)
          .join(',\n')
      : '    "lume-base": ">=2.0.0"';

    const content = `import { PluginManifest } from '@core/plugin/plugin-registry.service';

export const ${pascalName}PluginManifest: PluginManifest = {
  name: '${pluginName}',
  displayName: '${options.displayName || pascalName}',
  version: '1.0.0',
  compatibility: '>=2.0.0',
  author: '${options.author}',
  description: '${options.description || `${pascalName} plugin for Lume`}',

  dependencies: {
${dependencies}
  },

  entrypoint: 'dist/index.js',

  permissions: [
    '${pluginName}.read',
    '${pluginName}.write',
    '${pluginName}.delete',
  ],

  dbPrefix: '${dbPrefix}',

  hooks: {
    onInstall: 'migrations/001_create_tables.sql',
    onUninstall: 'migrations/001_drop_tables.sql',
  },
};
`;

    const filePath = path.join(pluginPath, `${pluginName}.manifest.ts`);
    fs.writeFileSync(filePath, content);
  }

  private createMigrations(pluginPath: string): void {
    const migrationsDir = path.join(pluginPath, 'migrations');

    // Create install migration
    const installSql = `-- ${path.basename(pluginPath)} plugin - Install migration
-- Add custom tables and schema here

CREATE TABLE IF NOT EXISTS \`${this.toKebabCase(path.basename(pluginPath))}_data\` (
  id INT AUTO_INCREMENT PRIMARY KEY,
  data JSON NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
`;

    fs.writeFileSync(path.join(migrationsDir, '001_create_tables.sql'), installSql);

    // Create uninstall migration
    const uninstallSql = `-- ${path.basename(pluginPath)} plugin - Uninstall migration
-- Drop tables and cleanup

DROP TABLE IF EXISTS \`${this.toKebabCase(path.basename(pluginPath))}_data\`;
`;

    fs.writeFileSync(path.join(migrationsDir, '001_drop_tables.sql'), uninstallSql);
  }

  private createIndexFile(options: PluginGeneratorOptions, pluginPath: string): void {
    const pluginName = path.basename(pluginPath);
    const pascalName = this.toPascalCase(pluginName);

    const content = `// ${pascalName} Plugin Entry Point
// Export your plugin module definition, entities, and workflows here

export { ${pascalName}PluginManifest } from './${pluginName}.manifest';

// Example exports:
// export { YourEntity } from './entities/your-entity';
// export { YourWorkflow } from './workflows/your-workflow';
`;

    const filePath = path.join(pluginPath, 'src', 'index.ts');
    fs.writeFileSync(filePath, content);
  }

  private toPascalCase(str: string): string {
    return str
      .split(/[-_]/)
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join('');
  }

  private toKebabCase(str: string): string {
    return str
      .replace(/([A-Z])/g, '-$1')
      .toLowerCase()
      .replace(/^-/, '');
  }
}
