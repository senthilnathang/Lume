/**
 * @fileoverview GraphQL Schema Generator
 * Auto-generates GraphQL schema from entity definitions
 */

import logger from '../services/logger.js';

class GraphQLSchemaGenerator {
  /**
   * Generate GraphQL type from entity
   * @param {EntityDefinition} entity - Entity definition
   * @returns {string} GraphQL type definition
   */
  static generateType(entity) {
    let typeDef = `type ${this.toPascalCase(entity.slug)} {\n`;

    // ID field
    typeDef += `  id: ID!\n`;

    // Regular fields
    for (const field of entity.fields || []) {
      if (field.computed) continue; // Skip computed fields in base type

      const type = this.mapFieldType(field);
      const required = field.required ? '!' : '';

      typeDef += `  ${field.name}: ${type}${required}\n`;
    }

    // Relations
    for (const relation of entity.relations || []) {
      const relationType = this.toPascalCase(relation.name);
      const required = relation.required ? '!' : '';

      if (relation.type === 'many-to-one') {
        typeDef += `  ${relation.name}: ${relationType}${required}\n`;
      } else if (relation.type === 'one-to-many') {
        typeDef += `  ${relation.name}: [${relationType}!]!\n`;
      }
    }

    // Audit fields
    if (entity.auditable) {
      typeDef += `  createdAt: DateTime!\n`;
      typeDef += `  updatedAt: DateTime!\n`;
    }

    if (entity.softDelete) {
      typeDef += `  deletedAt: DateTime\n`;
    }

    typeDef += `}\n`;

    return typeDef;
  }

  /**
   * Generate GraphQL input type for create mutations
   * @param {EntityDefinition} entity - Entity definition
   * @returns {string} GraphQL input type definition
   */
  static generateCreateInput(entity) {
    const inputName = `Create${this.toPascalCase(entity.slug)}Input`;
    let inputDef = `input ${inputName} {\n`;

    // Regular fields (excluding computed, id, audit fields)
    for (const field of entity.fields || []) {
      if (field.computed || field.name === 'id') continue;

      const type = this.mapFieldType(field);
      const required = field.required ? '!' : '';

      inputDef += `  ${field.name}: ${type}${required}\n`;
    }

    // Relations (only many-to-one)
    for (const relation of entity.relations || []) {
      if (relation.type === 'many-to-one') {
        const required = relation.required ? '!' : '';
        inputDef += `  ${relation.name}Id: Int${required}\n`;
      }
    }

    inputDef += `}\n`;

    return inputDef;
  }

  /**
   * Generate GraphQL input type for update mutations
   * @param {EntityDefinition} entity - Entity definition
   * @returns {string} GraphQL input type definition
   */
  static generateUpdateInput(entity) {
    const inputName = `Update${this.toPascalCase(entity.slug)}Input`;
    let inputDef = `input ${inputName} {\n`;

    // All fields optional for updates
    for (const field of entity.fields || []) {
      if (field.computed || field.name === 'id') continue;

      const type = this.mapFieldType(field);

      inputDef += `  ${field.name}: ${type}\n`;
    }

    // Relations
    for (const relation of entity.relations || []) {
      if (relation.type === 'many-to-one') {
        inputDef += `  ${relation.name}Id: Int\n`;
      }
    }

    inputDef += `}\n`;

    return inputDef;
  }

  /**
   * Generate GraphQL queries for entity
   * @param {EntityDefinition} entity - Entity definition
   * @returns {string} GraphQL query definitions
   */
  static generateQueries(entity) {
    const slug = entity.slug;
    const type = this.toPascalCase(slug);

    let queries = ``;

    // Single record query
    queries += `  ${slug}(id: ID!): ${type}\n`;

    // List query with pagination
    queries += `  ${slug}s(page: Int, pageSize: Int, filter: String): [${type}!]!\n`;

    // Count query
    queries += `  ${slug}Count(filter: String): Int!\n`;

    return queries;
  }

  /**
   * Generate GraphQL mutations for entity
   * @param {EntityDefinition} entity - Entity definition
   * @returns {string} GraphQL mutation definitions
   */
  static generateMutations(entity) {
    const slug = entity.slug;
    const type = this.toPascalCase(slug);
    const createInput = `Create${type}Input`;
    const updateInput = `Update${type}Input`;

    let mutations = ``;

    // Create mutation
    mutations += `  create${type}(input: ${createInput}!): ${type}!\n`;

    // Update mutation
    mutations += `  update${type}(id: ID!, input: ${updateInput}!): ${type}!\n`;

    // Delete mutation
    mutations += `  delete${type}(id: ID!): Boolean!\n`;

    // Bulk delete mutation
    mutations += `  delete${type}s(ids: [ID!]!): Int!\n`;

    return mutations;
  }

  /**
   * Generate complete GraphQL schema for all entities
   * @param {EntityDefinition[]} entities - Array of entity definitions
   * @returns {string} Complete GraphQL schema
   */
  static generateFullSchema(entities) {
    let schema = `# Auto-generated GraphQL Schema
scalar DateTime
scalar JSON

`;

    // Generate types
    for (const entity of entities) {
      schema += this.generateType(entity);
      schema += `\n`;
    }

    // Generate input types
    for (const entity of entities) {
      schema += this.generateCreateInput(entity);
      schema += `\n`;
      schema += this.generateUpdateInput(entity);
      schema += `\n`;
    }

    // Query root type
    schema += `type Query {\n`;
    for (const entity of entities) {
      schema += this.generateQueries(entity);
    }
    schema += `}\n\n`;

    // Mutation root type
    schema += `type Mutation {\n`;
    for (const entity of entities) {
      schema += this.generateMutations(entity);
    }
    schema += `}\n`;

    return schema;
  }

  /**
   * Map entity field type to GraphQL type
   * @private
   * @param {FieldDefinition} field - Field definition
   * @returns {string} GraphQL type name
   */
  static mapFieldType(field) {
    const typeMap = {
      text: 'String',
      email: 'String',
      phone: 'String',
      url: 'String',
      color: 'String',
      'rich-text': 'String',
      number: 'Int',
      date: 'DateTime',
      datetime: 'DateTime',
      boolean: 'Boolean',
      select: 'String',
      'multi-select': 'JSON',
      relation: 'Int',
    };

    return typeMap[field.type] || 'String';
  }

  /**
   * Convert slug to PascalCase type name
   * @private
   * @param {string} slug - Entity slug
   * @returns {string} PascalCase name
   */
  static toPascalCase(slug) {
    return slug
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join('');
  }
}

export default GraphQLSchemaGenerator;
