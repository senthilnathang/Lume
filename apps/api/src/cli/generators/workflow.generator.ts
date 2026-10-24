import * as fs from 'fs';
import * as path from 'path';

export interface WorkflowGeneratorOptions {
  name: string;
  entity: string;
  trigger: 'create' | 'update' | 'delete' | 'schedule';
  steps?: Array<{ type: string; description: string }>;
}

export class WorkflowGenerator {
  generate(options: WorkflowGeneratorOptions, basePath: string = './src/modules'): void {
    // Find the module directory based on entity name
    const moduleName = this.guessModuleName(options.entity);
    const modulePath = path.join(basePath, moduleName);
    const workflowDir = path.join(modulePath, 'workflows');

    if (!fs.existsSync(workflowDir)) {
      fs.mkdirSync(workflowDir, { recursive: true });
    }

    const fileName = this.toKebabCase(options.name);
    const filePath = path.join(workflowDir, `${fileName}.workflow.ts`);

    const content = this.generateContent(options);
    fs.writeFileSync(filePath, content);

    console.log(`✓ Created workflow: ${filePath}`);
  }

  private generateContent(options: WorkflowGeneratorOptions): string {
    const pascalName = this.toPascalCase(options.name);
    const triggerMap = {
      create: "{ type: 'record.created' }",
      update: "{ type: 'record.updated' }",
      delete: "{ type: 'record.deleted' }",
      schedule: "{ type: 'schedule', cron: '0 */6 * * *' }",
    };

    const triggerCode = triggerMap[options.trigger] || "{ type: 'record.created' }";

    const stepsCode = options.steps
      ? options.steps
          .map(s => `    // ${s.description}\n    { type: '${s.type}' },`)
          .join('\n')
      : `    // Add workflow steps here
    { type: 'set_field', field: 'status', value: 'processing' },`;

    return `import { defineWorkflow } from '@core/workflow/define-workflow';

export const ${pascalName} = defineWorkflow({
  name: '${this.toKebabCase(options.name)}',
  version: '1.0.0',
  entity: '${options.entity}',
  trigger: ${triggerCode},
  steps: [
${stepsCode}
  ],
  onError: 'continue',
  maxRetries: 2,
});
`;
  }

  private guessModuleName(entityName: string): string {
    // Simple heuristic: convert entity name to kebab case
    return this.toKebabCase(entityName);
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
