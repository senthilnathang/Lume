/**
 * @fileoverview Unit tests for SchemaGenerator
 */

import { describe, it, expect } from '@jest/globals';
import SchemaGenerator from '../../src/core/db/schema-generator.js';
import { defineEntity, defineField } from '../../src/domains/entity/entity-builder.js';

describe('SchemaGenerator', () => {
  it('should generate schema for a simple entity', () => {
    const ent = defineEntity({
      slug: 'ticket',
      orm: 'drizzle',
      tableName: 'tickets',
      fields: [
        defineField('title', 'text', { required: true }),
        defineField('status', 'select'),
      ],
      softDelete: false,
      auditable: false,
    });

    const schema = SchemaGenerator.generateSchema(ent);

    expect(schema.tableName).toBe('tickets');
    expect(schema.columns.title).toBeDefined();
    expect(schema.columns.status).toBeDefined();
  });

  it('should add soft delete column', () => {
    const ent = defineEntity({
      slug: 'item',
      orm: 'drizzle',
      tableName: 'items',
      fields: [defineField('name', 'text')],
      softDelete: true,
      auditable: false,
    });

    const schema = SchemaGenerator.generateSchema(ent);

    expect(schema.columns.deleted_at).toBeDefined();
  });

  it('should add audit columns', () => {
    const ent = defineEntity({
      slug: 'item',
      orm: 'drizzle',
      tableName: 'items',
      fields: [defineField('name', 'text')],
      softDelete: false,
      auditable: true,
    });

    const schema = SchemaGenerator.generateSchema(ent);

    expect(schema.columns.created_at).toBeDefined();
    expect(schema.columns.updated_at).toBeDefined();
  });

  it('should skip computed fields', () => {
    const ent = defineEntity({
      slug: 'ticket',
      orm: 'drizzle',
      tableName: 'tickets',
      fields: [
        defineField('title', 'text'),
        defineField('daysOpen', 'number', {
          computed: true,
          computed_expression: 'daysSince(createdAt)',
        }),
      ],
      softDelete: false,
      auditable: false,
    });

    const schema = SchemaGenerator.generateSchema(ent);

    expect(schema.columns.title).toBeDefined();
    expect(schema.columns.daysOpen).toBeNull();
  });

  it('should map field types correctly', () => {
    const ent = defineEntity({
      slug: 'test',
      orm: 'drizzle',
      tableName: 'test',
      fields: [
        defineField('text_field', 'text'),
        defineField('num_field', 'number'),
        defineField('date_field', 'date'),
        defineField('bool_field', 'boolean'),
        defineField('rich_field', 'rich-text'),
      ],
      softDelete: false,
      auditable: false,
    });

    const schema = SchemaGenerator.generateSchema(ent);

    expect(schema.columns.text_field.type).toBe('varchar');
    expect(schema.columns.num_field.type).toBe('integer');
    expect(schema.columns.date_field.type).toBe('date');
    expect(schema.columns.bool_field.type).toBe('boolean');
    expect(schema.columns.rich_field.type).toBe('text');
  });

  it('should handle nullable and unique constraints', () => {
    const ent = defineEntity({
      slug: 'test',
      orm: 'drizzle',
      tableName: 'test',
      fields: [
        defineField('required', 'text', { required: true }),
        defineField('optional', 'text', { required: false }),
        defineField('unique_field', 'text', { unique: true }),
      ],
      softDelete: false,
      auditable: false,
    });

    const schema = SchemaGenerator.generateSchema(ent);

    expect(schema.columns.required.nullable).toBe(false);
    expect(schema.columns.optional.nullable).toBe(true);
    expect(schema.columns.unique_field.unique).toBe(true);
  });

  it('should create indexes for indexed fields', () => {
    const ent = defineEntity({
      slug: 'test',
      orm: 'drizzle',
      tableName: 'test',
      fields: [
        defineField('name', 'text', { indexed: true }),
        defineField('email', 'email', { indexed: true }),
      ],
      softDelete: false,
      auditable: false,
    });

    const schema = SchemaGenerator.generateSchema(ent);

    const indexNames = schema.indexes.map(i => i.name);
    expect(indexNames.some(n => n.includes('name'))).toBe(true);
    expect(indexNames.some(n => n.includes('email'))).toBe(true);
  });

  it('should generate SQL', () => {
    const ent = defineEntity({
      slug: 'ticket',
      orm: 'drizzle',
      tableName: 'tickets',
      fields: [
        defineField('title', 'text', { required: true }),
      ],
      softDelete: false,
      auditable: false,
    });

    const sql = SchemaGenerator.generateSQL(ent);

    expect(sql).toContain('CREATE TABLE');
    expect(sql).toContain('tickets');
    expect(sql).toContain('title');
  });

  it('should validate entity', () => {
    const ent = defineEntity({
      slug: 'test',
      orm: 'drizzle',
      tableName: 'test',
      fields: [defineField('name', 'text')],
    });

    const errors = SchemaGenerator.validate(ent);
    expect(errors).toHaveLength(0);
  });

  it('should catch validation errors', () => {
    const ent = {
      slug: 'test',
      orm: 'drizzle',
      tableName: 'test',
      fields: [],
    };

    const errors = SchemaGenerator.validate(ent);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors.some(e => e.includes('at least one field'))).toBe(true);
  });
});
