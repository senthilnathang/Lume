/**
 * @fileoverview OpenAPI/Swagger Documentation Generator
 * Auto-generates OpenAPI 3.0 spec from entity definitions
 */

import logger from '../services/logger.js';

class OpenAPIGenerator {
  /**
   * Generate complete OpenAPI spec for all entities
   * @param {EntityDefinition[]} entities - Array of entity definitions
   * @param {Object} appInfo - App information
   * @returns {Object} OpenAPI 3.0 specification
   */
  static generateSpec(entities, appInfo = {}) {
    const spec = {
      openapi: '3.0.0',
      info: {
        title: appInfo.title || 'Lume API',
        version: appInfo.version || '1.0.0',
        description:
          appInfo.description ||
          'Auto-generated REST API documentation',
        contact: appInfo.contact || {
          name: 'Support',
          url: 'https://example.com/support',
        },
      },
      servers: appInfo.servers || [
        {
          url: 'http://localhost:3000/api',
          description: 'Development server',
        },
        {
          url: 'https://api.example.com',
          description: 'Production server',
        },
      ],
      paths: {},
      components: {
        schemas: {},
        securitySchemes: {
          BearerAuth: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT',
          },
        },
      },
      security: [
        {
          BearerAuth: [],
        },
      ],
      tags: [],
    };

    // Generate schemas and paths for each entity
    for (const entity of entities) {
      // Add tag
      spec.tags.push({
        name: entity.slug,
        description: entity.description || `${entity.label} resource`,
      });

      // Generate schemas
      spec.components.schemas[this.getSchemaName(entity, 'Type')] = this.generateSchema(
        entity
      );
      spec.components.schemas[this.getSchemaName(entity, 'Create')] = this.generateCreateSchema(
        entity
      );
      spec.components.schemas[this.getSchemaName(entity, 'Update')] = this.generateUpdateSchema(
        entity
      );

      // Generate paths
      this.addPaths(spec.paths, entity);
    }

    return spec;
  }

  /**
   * Generate OpenAPI schema for entity
   * @private
   * @param {EntityDefinition} entity - Entity definition
   * @returns {Object} OpenAPI schema object
   */
  static generateSchema(entity) {
    const properties = {
      id: {
        type: 'integer',
        description: 'Unique identifier',
        example: 1,
      },
    };

    // Add field properties
    for (const field of entity.fields || []) {
      if (field.computed) continue;

      properties[field.name] = {
        type: this.getOpenAPIType(field),
        description: field.description || field.name,
        example: this.getExampleValue(field),
      };

      if (field.type === 'select' && field.validation) {
        const enumRule = field.validation.find(r => r.rule === 'enum');
        if (enumRule) {
          properties[field.name].enum = enumRule.values;
        }
      }
    }

    // Add audit fields
    if (entity.auditable) {
      properties.createdAt = {
        type: 'string',
        format: 'date-time',
        description: 'Creation timestamp',
      };
      properties.updatedAt = {
        type: 'string',
        format: 'date-time',
        description: 'Last update timestamp',
      };
    }

    if (entity.softDelete) {
      properties.deletedAt = {
        type: 'string',
        format: 'date-time',
        description: 'Soft delete timestamp',
        nullable: true,
      };
    }

    return {
      type: 'object',
      required: ['id', ...entity.fields.filter(f => f.required).map(f => f.name)],
      properties,
    };
  }

  /**
   * Generate OpenAPI schema for create input
   * @private
   * @param {EntityDefinition} entity - Entity definition
   * @returns {Object} OpenAPI schema object
   */
  static generateCreateSchema(entity) {
    const properties = {};

    for (const field of entity.fields || []) {
      if (field.computed || field.name === 'id') continue;

      properties[field.name] = {
        type: this.getOpenAPIType(field),
        description: field.description || field.name,
        example: this.getExampleValue(field),
      };
    }

    const required = entity.fields
      .filter(f => f.required && f.name !== 'id')
      .map(f => f.name);

    return {
      type: 'object',
      required,
      properties,
    };
  }

  /**
   * Generate OpenAPI schema for update input
   * @private
   * @param {EntityDefinition} entity - Entity definition
   * @returns {Object} OpenAPI schema object
   */
  static generateUpdateSchema(entity) {
    const properties = {};

    for (const field of entity.fields || []) {
      if (field.computed || field.name === 'id') continue;

      properties[field.name] = {
        type: this.getOpenAPIType(field),
        description: field.description || field.name,
        example: this.getExampleValue(field),
      };
    }

    return {
      type: 'object',
      properties,
    };
  }

  /**
   * Add REST paths to spec
   * @private
   * @param {Object} paths - OpenAPI paths object
   * @param {EntityDefinition} entity - Entity definition
   */
  static addPaths(paths, entity) {
    const slug = entity.slug;
    const basePath = `/${slug}`;

    // GET list
    paths[basePath] = {
      get: {
        tags: [slug],
        summary: `List ${entity.label}s`,
        parameters: [
          {
            name: 'page',
            in: 'query',
            schema: { type: 'integer', default: 1 },
          },
          {
            name: 'pageSize',
            in: 'query',
            schema: { type: 'integer', default: 25, maximum: 200 },
          },
          {
            name: 'filter',
            in: 'query',
            schema: { type: 'string' },
            description: 'JSON filter conditions',
          },
        ],
        responses: {
          200: {
            description: 'List of records',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                    data: {
                      type: 'array',
                      items: { $ref: `#/components/schemas/${this.getSchemaName(entity, 'Type')}` },
                    },
                  },
                },
              },
            },
          },
        },
      },
      post: {
        tags: [slug],
        summary: `Create ${entity.label}`,
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: `#/components/schemas/${this.getSchemaName(entity, 'Create')}` },
            },
          },
        },
        responses: {
          201: {
            description: 'Record created',
            content: {
              'application/json': {
                schema: { $ref: `#/components/schemas/${this.getSchemaName(entity, 'Type')}` },
              },
            },
          },
        },
      },
    };

    // GET single
    paths[`${basePath}/{id}`] = {
      get: {
        tags: [slug],
        summary: `Get ${entity.label}`,
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'integer' },
          },
        ],
        responses: {
          200: {
            description: 'Record found',
            content: {
              'application/json': {
                schema: { $ref: `#/components/schemas/${this.getSchemaName(entity, 'Type')}` },
              },
            },
          },
          404: {
            description: 'Record not found',
          },
        },
      },
      put: {
        tags: [slug],
        summary: `Update ${entity.label}`,
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'integer' },
          },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: `#/components/schemas/${this.getSchemaName(entity, 'Update')}` },
            },
          },
        },
        responses: {
          200: {
            description: 'Record updated',
            content: {
              'application/json': {
                schema: { $ref: `#/components/schemas/${this.getSchemaName(entity, 'Type')}` },
              },
            },
          },
        },
      },
      delete: {
        tags: [slug],
        summary: `Delete ${entity.label}`,
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'integer' },
          },
        ],
        responses: {
          204: {
            description: 'Record deleted',
          },
        },
      },
    };
  }

  /**
   * Get OpenAPI type for field
   * @private
   * @param {FieldDefinition} field - Field definition
   * @returns {string} OpenAPI type
   */
  static getOpenAPIType(field) {
    const typeMap = {
      text: 'string',
      email: 'string',
      phone: 'string',
      url: 'string',
      color: 'string',
      'rich-text': 'string',
      number: 'integer',
      date: 'string',
      datetime: 'string',
      boolean: 'boolean',
      select: 'string',
      'multi-select': 'array',
      relation: 'integer',
    };

    return typeMap[field.type] || 'string';
  }

  /**
   * Get example value for field
   * @private
   * @param {FieldDefinition} field - Field definition
   * @returns {*} Example value
   */
  static getExampleValue(field) {
    const examples = {
      text: 'Example text',
      email: 'user@example.com',
      phone: '+1234567890',
      url: 'https://example.com',
      color: '#FF0000',
      'rich-text': '<p>Rich content</p>',
      number: 42,
      date: '2026-04-30',
      datetime: '2026-04-30T12:00:00Z',
      boolean: true,
      select: 'option1',
      'multi-select': ['option1', 'option2'],
      relation: 1,
    };

    return examples[field.type] || '';
  }

  /**
   * Get schema name with suffix
   * @private
   * @param {EntityDefinition} entity - Entity definition
   * @param {string} suffix - Schema suffix (Type, Create, Update)
   * @returns {string} Schema name
   */
  static getSchemaName(entity, suffix) {
    const base = entity.slug
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join('');

    return `${base}${suffix}`;
  }
}

export default OpenAPIGenerator;
