import { Injectable } from '@nestjs/common';
import { MetadataRegistryService, EntityDefinition } from '@core/runtime/metadata-registry.service';

@Injectable()
export class EntityRegistryService {
  constructor(private metadataRegistry: MetadataRegistryService) {}

  register(definition: EntityDefinition): void {
    this.metadataRegistry.registerEntity(definition);
  }

  extend(entityName: string, extension: Partial<EntityDefinition>): void {
    this.metadataRegistry.extendEntity(entityName, extension);
  }

  resolve(name: string): EntityDefinition | undefined {
    return this.metadataRegistry.getEntityWithExtensions(name);
  }

  get(name: string): EntityDefinition | undefined {
    return this.metadataRegistry.getEntity(name);
  }

  list(): EntityDefinition[] {
    return this.metadataRegistry.listEntities();
  }

  getWithExtensions(name: string): EntityDefinition | undefined {
    return this.metadataRegistry.getEntityWithExtensions(name);
  }

  generateDrizzleSchema(definition: EntityDefinition): string {
    const fieldDefinitions = Object.entries(definition.fields)
      .map(([name, field]) => {
        const type = mapFieldTypeToDrizzle(field.type);
        const notNull = field.required ? '.notNull()' : '';
        const unique = field.unique ? '.unique()' : '';
        return `${name}: ${type}${notNull}${unique}`;
      })
      .join(',\n    ');

    return `export const ${definition.name} = mysqlTable('${definition.name}', {
    id: int().primaryKey().autoincrement(),
    ${fieldDefinitions},
    createdAt: timestamp().defaultNow(),
    updatedAt: timestamp().onUpdateNow(),
    deletedAt: timestamp(),
  })`;
  }

  generatePrismaModel(definition: EntityDefinition): string {
    const fieldDefinitions = Object.entries(definition.fields)
      .map(([name, field]) => {
        const type = mapFieldTypeToPrisma(field.type);
        const required = field.required ? '' : '?';
        const unique = field.unique ? '@unique' : '';
        return `  ${name}      ${type}${required}    ${unique}`;
      })
      .join('\n');

    return `model ${definition.name} {
  id           Int     @id @default(autoincrement())
${fieldDefinitions}
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
  deletedAt    DateTime?
}`;
  }
}

function mapFieldTypeToDrizzle(fieldType: string): string {
  const typeMap: Record<string, string> = {
    string: 'varchar(255)',
    int: 'int()',
    number: 'decimal(10,2)',
    boolean: 'boolean()',
    date: 'date()',
    datetime: 'datetime()',
    text: 'text()',
    json: 'json()',
    email: 'varchar(255)',
    url: 'varchar(255)',
    phone: 'varchar(20)',
  };
  return typeMap[fieldType] || 'varchar(255)';
}

function mapFieldTypeToPrisma(fieldType: string): string {
  const typeMap: Record<string, string> = {
    string: 'String',
    int: 'Int',
    number: 'Decimal',
    boolean: 'Boolean',
    date: 'DateTime',
    datetime: 'DateTime',
    text: 'String',
    json: 'Json',
    email: 'String',
    url: 'String',
    phone: 'String',
  };
  return typeMap[fieldType] || 'String';
}
