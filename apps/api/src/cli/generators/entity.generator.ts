import * as fs from 'fs';
import * as path from 'path';

export interface EntityGeneratorOptions {
  name: string;
  fields?: Array<{ name: string; type: string; required?: boolean }>;
  description?: string;
  withHooks?: boolean;
}

export class EntityGenerator {
  generate(options: EntityGeneratorOptions, basePath: string = './src/modules'): void {
    const entityName = this.toPascalCase(options.name);
    const dir = path.join(basePath, this.toKebabCase(options.name), 'entities');

    // Create directory if it doesn't exist
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    const filePath = path.join(dir, `${this.toKebabCase(options.name)}.entity.ts`);

    // Generate fields definition
    const fieldsCode = this.generateFieldsCode(options);

    // Generate hooks if requested
    const hooksCode = options.withHooks ? this.generateHooksCode(entityName) : '';

    const content = `import { defineEntity } from '@core/entity/define-entity';

export const ${entityName}Entity = defineEntity('${entityName}', {
  label: '${entityName}',
  description: '${options.description || `A ${entityName} entity`}',
  icon: '${this.toKebabCase(options.name)}',
  fields: {
${fieldsCode}
  },
${hooksCode}
  aiMetadata: {
    description: '${options.description || `A ${entityName} entity`}',
    sensitiveFields: [],
  },
});
`;

    fs.writeFileSync(filePath, content);
    console.log(`✓ Created entity: ${filePath}`);
  }

  private generateFieldsCode(options: EntityGeneratorOptions): string {
    const defaultFields = [
      { name: 'id', type: 'int', required: true },
      { name: 'name', type: 'string', required: true },
      { name: 'createdAt', type: 'datetime' },
      { name: 'updatedAt', type: 'datetime' },
      { name: 'deletedAt', type: 'datetime' },
    ];

    const fields = options.fields ? [...defaultFields.slice(0, 1), ...options.fields, ...defaultFields.slice(2)] : defaultFields;
    const uniqueFields = Array.from(new Map(fields.map(f => [f.name, f])).values());

    return uniqueFields
      .map(f => {
        const required = f.required ? ', required: true' : '';
        const isIndexed = f.required ? ', isIndexed: true' : '';
        return `    ${f.name}: { name: '${f.name}', type: '${f.type}'${required}${isIndexed} },`;
      })
      .join('\n');
  }

  private generateHooksCode(entityName: string): string {
    return `  hooks: {
    beforeCreate: async (data, ctx) => {
      // Add custom logic before creation
      return data;
    },
    afterCreate: async (record, ctx) => {
      // Add custom logic after creation
      console.log(\`${entityName} created: \${record.id}\`);
    },
    beforeUpdate: async (id, data, ctx) => {
      // Add custom logic before update
      return data;
    },
  },
`;
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
