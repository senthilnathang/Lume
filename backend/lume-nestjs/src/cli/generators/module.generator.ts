import * as fs from 'fs';
import * as path from 'path';

export interface ModuleGeneratorOptions {
  name: string;
  description?: string;
  depends?: string[];
  withEntities?: number;
  withWorkflows?: boolean;
}

export class ModuleGenerator {
  generate(options: ModuleGeneratorOptions, basePath: string = './src/modules'): void {
    const moduleName = this.toKebabCase(options.name);
    const modulePath = path.join(basePath, moduleName);

    // Create directory structure
    this.createDirectories(modulePath);

    // Create module definition
    this.createModuleDefinition(options, modulePath);

    // Create entities
    if (options.withEntities && options.withEntities > 0) {
      this.createExampleEntities(options, modulePath, options.withEntities);
    }

    // Create workflows
    if (options.withWorkflows) {
      this.createExampleWorkflows(options, modulePath);
    }

    console.log(`✓ Created module: ${modulePath}`);
    console.log(`  - Module definition`);
    if (options.withEntities) console.log(`  - ${options.withEntities} example entities`);
    if (options.withWorkflows) console.log(`  - Example workflows`);
  }

  private createDirectories(modulePath: string): void {
    const dirs = ['entities', 'services', 'controllers', 'workflows', 'static/views', 'static/api'];
    for (const dir of dirs) {
      const dirPath = path.join(modulePath, dir);
      if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
      }
    }
  }

  private createModuleDefinition(options: ModuleGeneratorOptions, modulePath: string): void {
    const moduleName = path.basename(modulePath);
    const pascalName = this.toPascalCase(moduleName);
    const dependencies = options.depends ? options.depends.map(d => `'${d}'`).join(', ') : '';

    const content = `import { defineModule } from '@core/module/define-module';

export const ${pascalName}Module = defineModule({
  name: '${moduleName}',
  version: '1.0.0',
  description: '${options.description || `${pascalName} module`}',
${dependencies ? `  depends: [${dependencies}],` : ''}
  permissions: [
    '${moduleName}.read',
    '${moduleName}.write',
    '${moduleName}.delete',
  ],
  hooks: {
    onLoad: async () => {
      console.log('${pascalName} module loaded');
    },
  },
});
`;

    const filePath = path.join(modulePath, `${moduleName}.module.definition.ts`);
    fs.writeFileSync(filePath, content);
  }

  private createExampleEntities(options: ModuleGeneratorOptions, modulePath: string, count: number): void {
    for (let i = 0; i < count; i++) {
      const entityName = `${this.toPascalCase(path.basename(modulePath))}Entity${i > 0 ? i + 1 : ''}`;
      const kebabName = this.toKebabCase(entityName);

      const content = `import { defineEntity } from '@core/entity/define-entity';

export const ${entityName} = defineEntity('${entityName}', {
  label: '${entityName}',
  fields: {
    id: { name: 'id', type: 'int', required: true },
    name: { name: 'name', type: 'string', required: true, isIndexed: true },
    status: { name: 'status', type: 'string', defaultValue: 'active', isIndexed: true },
    createdAt: { name: 'createdAt', type: 'datetime' },
    updatedAt: { name: 'updatedAt', type: 'datetime' },
    deletedAt: { name: 'deletedAt', type: 'datetime' },
  },
});
`;

      const filePath = path.join(modulePath, 'entities', `${kebabName}.entity.ts`);
      fs.writeFileSync(filePath, content);
    }
  }

  private createExampleWorkflows(options: ModuleGeneratorOptions, modulePath: string): void {
    const moduleName = path.basename(modulePath);
    const pascalName = this.toPascalCase(moduleName);

    const content = `import { defineWorkflow } from '@core/workflow/define-workflow';

export const ${pascalName}Workflow = defineWorkflow({
  name: '${moduleName}-auto-process',
  version: '1.0.0',
  entity: '${pascalName}Entity',
  trigger: {
    type: 'record.created',
  },
  steps: [
    {
      type: 'condition',
      if: { field: 'status', operator: '==', value: 'new' },
      then: [
        {
          type: 'set_field',
          field: 'status',
          value: 'processing',
        },
      ],
    },
  ],
  onError: 'continue',
});
`;

    const filePath = path.join(modulePath, 'workflows', `${moduleName}.workflow.ts`);
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
