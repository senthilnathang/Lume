/**
 * Integration Test: EntityBuilderService
 * Tests CRUD operations for entities, fields, and views
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import prisma from '../../src/core/db/prisma.js';
import { EntityBuilderService } from '../../src/modules/base/services/entity-builder.service.js';

describe('EntityBuilderService', () => {
  let service;
  let testCompanyId = 1;
  let testUserId = 1;
  let testEntityId;

  beforeAll(async () => {
    service = new EntityBuilderService(prisma);

    // Clean up test data
    try {
      await prisma.entityRecord.deleteMany({});
    } catch (e) {
      // May not exist yet
    }
    try {
      await prisma.entityView.deleteMany({});
    } catch (e) {
      // May not exist yet
    }
    try {
      await prisma.entityField.deleteMany({});
    } catch (e) {
      // May not exist yet
    }
    try {
      await prisma.entity.deleteMany({
        where: { name: { startsWith: 'test_' } }
      });
    } catch (e) {
      // May not exist yet
    }
  });

  afterAll(async () => {
    // Final cleanup
    try {
      await prisma.entityRecord.deleteMany({});
    } catch (e) {
      // Ignore
    }
    try {
      await prisma.entityView.deleteMany({});
    } catch (e) {
      // Ignore
    }
    try {
      await prisma.entityField.deleteMany({});
    } catch (e) {
      // Ignore
    }
    try {
      await prisma.entity.deleteMany({
        where: { name: { startsWith: 'test_' } }
      });
    } catch (e) {
      // Ignore
    }
  });

  describe('createEntity', () => {
    it('creates a new entity with metadata', async () => {
      const entity = await service.createEntity(testCompanyId, testUserId, {
        name: 'test_product',
        label: 'Product',
        description: 'Product entity for testing'
      });

      expect(entity).toBeDefined();
      expect(entity.id).toBeDefined();
      expect(entity.name).toBe('test_product');
      expect(entity.label).toBe('Product');
      expect(entity.description).toBe('Product entity for testing');
      expect(entity.createdBy).toBe(testUserId);
      expect(entity.deletedAt).toBeNull();

      testEntityId = entity.id;
    });

    it('throws error if name already exists', async () => {
      await expect(
        service.createEntity(testCompanyId, testUserId, {
          name: 'test_product',
          label: 'Another Product',
          description: 'Should fail'
        })
      ).rejects.toThrow('Entity with name test_product already exists');
    });

    it('creates entity with required fields only', async () => {
      const entity = await service.createEntity(testCompanyId, testUserId, {
        name: 'test_customer',
        label: 'Customer'
      });

      expect(entity.name).toBe('test_customer');
      expect(entity.label).toBe('Customer');
      expect(entity.description).toBeNull();
    });
  });

  describe('getEntity', () => {
    it('fetches entity with all fields', async () => {
      const entity = await service.getEntity(testEntityId);

      expect(entity).toBeDefined();
      expect(entity.id).toBe(testEntityId);
      expect(entity.name).toBe('test_product');
      expect(entity.fields).toBeDefined();
      expect(Array.isArray(entity.fields)).toBe(true);
    });

    it('returns empty fields array for entity without fields', async () => {
      const entity = await service.getEntity(testEntityId);

      expect(entity.fields).toEqual([]);
    });

    it('throws error if entity not found', async () => {
      await expect(service.getEntity(99999)).rejects.toThrow('Entity not found');
    });
  });

  describe('addField', () => {
    it('adds a text field to entity', async () => {
      const field = await service.addField(testEntityId, {
        name: 'product_name',
        label: 'Product Name',
        type: 'text',
        required: true,
        helpText: 'Enter the product name'
      });

      expect(field).toBeDefined();
      expect(field.id).toBeDefined();
      expect(field.name).toBe('product_name');
      expect(field.label).toBe('Product Name');
      expect(field.type).toBe('text');
      expect(field.required).toBe(true);
      expect(field.helpText).toBe('Enter the product name');
      expect(field.deletedAt).toBeNull();
    });

    it('adds a select field with options', async () => {
      const selectOptions = [
        { value: 'cat1', label: 'Category 1' },
        { value: 'cat2', label: 'Category 2' }
      ];

      const field = await service.addField(testEntityId, {
        name: 'category',
        label: 'Category',
        type: 'select',
        required: false,
        selectOptions
      });

      expect(field).toBeDefined();
      expect(field.name).toBe('category');
      expect(field.type).toBe('select');
      expect(field.selectOptions).toEqual(selectOptions);
    });

    it('adds a number field with default value', async () => {
      const field = await service.addField(testEntityId, {
        name: 'stock_quantity',
        label: 'Stock Quantity',
        type: 'number',
        required: false,
        defaultValue: '0'
      });

      expect(field).toBeDefined();
      expect(field.name).toBe('stock_quantity');
      expect(field.type).toBe('number');
      expect(field.defaultValue).toBe('0');
    });

    it('prevents duplicate field names within entity', async () => {
      await expect(
        service.addField(testEntityId, {
          name: 'product_name',
          label: 'Another name field',
          type: 'text'
        })
      ).rejects.toThrow('Field with name product_name already exists in this entity');
    });

    it('allows same field name in different entities', async () => {
      const entity2 = await service.createEntity(testCompanyId, testUserId, {
        name: 'test_order',
        label: 'Order'
      });

      const field = await service.addField(entity2.id, {
        name: 'product_name',
        label: 'Product Name',
        type: 'text'
      });

      expect(field.name).toBe('product_name');
    });

    it('parses selectOptions JSON correctly', async () => {
      const options = [
        { value: 'active', label: 'Active' },
        { value: 'inactive', label: 'Inactive' }
      ];

      const field = await service.addField(testEntityId, {
        name: 'status',
        label: 'Status',
        type: 'select',
        selectOptions: options
      });

      expect(Array.isArray(field.selectOptions)).toBe(true);
      expect(field.selectOptions).toEqual(options);
    });
  });

  describe('updateField', () => {
    let fieldId;

    beforeEach(async () => {
      const field = await service.addField(testEntityId, {
        name: `field_${Date.now()}`,
        label: 'Original Label',
        type: 'text',
        required: false
      });
      fieldId = field.id;
    });

    it('updates field label and required status', async () => {
      const updated = await service.updateField(fieldId, {
        label: 'Updated Label',
        required: true
      });

      expect(updated.label).toBe('Updated Label');
      expect(updated.required).toBe(true);
    });

    it('updates help text and default value', async () => {
      const updated = await service.updateField(fieldId, {
        helpText: 'New help text',
        defaultValue: 'default123'
      });

      expect(updated.helpText).toBe('New help text');
      expect(updated.defaultValue).toBe('default123');
    });

    it('updates select options', async () => {
      const selectField = await service.addField(testEntityId, {
        name: `select_${Date.now()}`,
        label: 'Select Field',
        type: 'select',
        selectOptions: [{ value: 'old', label: 'Old' }]
      });

      const updated = await service.updateField(selectField.id, {
        selectOptions: [
          { value: 'new1', label: 'New 1' },
          { value: 'new2', label: 'New 2' }
        ]
      });

      expect(updated.selectOptions).toEqual([
        { value: 'new1', label: 'New 1' },
        { value: 'new2', label: 'New 2' }
      ]);
    });

    it('prevents renaming field', async () => {
      await expect(
        service.updateField(fieldId, {
          name: 'new_name'
        })
      ).rejects.toThrow('Cannot rename field');
    });

    it('prevents changing field type', async () => {
      await expect(
        service.updateField(fieldId, {
          type: 'number'
        })
      ).rejects.toThrow('Cannot change field type');
    });

    it('allows partial updates without immutable fields', async () => {
      const updated = await service.updateField(fieldId, {
        label: 'New Label'
      });

      expect(updated.label).toBe('New Label');
    });
  });

  describe('deleteField', () => {
    it('soft-deletes field', async () => {
      const field = await service.addField(testEntityId, {
        name: `delete_test_${Date.now()}`,
        label: 'Field to Delete',
        type: 'text'
      });

      const fieldId = field.id;

      await service.deleteField(fieldId);

      // Check that deletedAt is set
      const deleted = await prisma.entityField.findUnique({
        where: { id: fieldId }
      });

      expect(deleted.deletedAt).not.toBeNull();
    });

    it('deleted field not returned in getEntity', async () => {
      const field = await service.addField(testEntityId, {
        name: `hide_test_${Date.now()}`,
        label: 'Field to Hide',
        type: 'text'
      });

      await service.deleteField(field.id);

      const entity = await service.getEntity(testEntityId);
      const fieldNames = entity.fields.map(f => f.name);

      expect(fieldNames).not.toContain(`hide_test_${field.name.split('_').pop()}`);
    });
  });

  describe('createView', () => {
    it('creates a list view for entity', async () => {
      const view = await service.createView(testEntityId, {
        name: 'All Products',
        type: 'list',
        config: {
          columns: ['product_name', 'category', 'status'],
          pageSize: 50
        }
      });

      expect(view).toBeDefined();
      expect(view.id).toBeDefined();
      expect(view.name).toBe('All Products');
      expect(view.type).toBe('list');
      expect(view.config).toEqual({
        columns: ['product_name', 'category', 'status'],
        pageSize: 50
      });
    });

    it('creates a grid view for entity', async () => {
      const view = await service.createView(testEntityId, {
        name: 'Grid View',
        type: 'grid',
        config: { columns: 3 }
      });

      expect(view.type).toBe('grid');
      expect(view.config).toEqual({ columns: 3 });
    });

    it('creates a form view for entity', async () => {
      const view = await service.createView(testEntityId, {
        name: 'Edit Form',
        type: 'form',
        config: { layout: 'vertical' }
      });

      expect(view.type).toBe('form');
      expect(view.config).toEqual({ layout: 'vertical' });
    });

    it('creates a kanban view for entity', async () => {
      const view = await service.createView(testEntityId, {
        name: 'Kanban Board',
        type: 'kanban',
        config: {
          groupBy: 'status',
          orderBy: 'created_at'
        }
      });

      expect(view.type).toBe('kanban');
      expect(view.config.groupBy).toBe('status');
    });

    it('creates a calendar view for entity', async () => {
      const view = await service.createView(testEntityId, {
        name: 'Calendar View',
        type: 'calendar',
        config: {
          dateField: 'start_date',
          endDateField: 'end_date'
        }
      });

      expect(view.type).toBe('calendar');
      expect(view.config.dateField).toBe('start_date');
    });

    it('parses config JSON correctly', async () => {
      const config = {
        filters: [{ field: 'status', value: 'active' }],
        sort: { field: 'name', order: 'asc' }
      };

      const view = await service.createView(testEntityId, {
        name: 'Filtered View',
        type: 'list',
        config
      });

      expect(view.config).toEqual(config);
    });

    it('prevents duplicate view names within entity', async () => {
      const viewName = `unique_view_${Date.now()}`;

      await service.createView(testEntityId, {
        name: viewName,
        type: 'list',
        config: {}
      });

      await expect(
        service.createView(testEntityId, {
          name: viewName,
          type: 'grid',
          config: {}
        })
      ).rejects.toThrow(`View with name ${viewName} already exists in this entity`);
    });

    it('allows same view name in different entities', async () => {
      const entity2 = await service.createEntity(testCompanyId, testUserId, {
        name: `test_entity_${Date.now()}`,
        label: 'Test Entity'
      });

      const view1 = await service.createView(testEntityId, {
        name: 'MyView',
        type: 'list',
        config: {}
      });

      const view2 = await service.createView(entity2.id, {
        name: 'MyView',
        type: 'grid',
        config: {}
      });

      expect(view1.name).toBe(view2.name);
      expect(view1.entityId).not.toBe(view2.entityId);
    });
  });

  describe('getViews', () => {
    it('returns all views for entity', async () => {
      const entity = await service.createEntity(testCompanyId, testUserId, {
        name: `views_test_${Date.now()}`,
        label: 'Views Test Entity'
      });

      await service.createView(entity.id, {
        name: 'View 1',
        type: 'list',
        config: { columns: ['a', 'b'] }
      });

      await service.createView(entity.id, {
        name: 'View 2',
        type: 'grid',
        config: { columns: 2 }
      });

      const views = await service.getViews(entity.id);

      expect(views).toBeDefined();
      expect(Array.isArray(views)).toBe(true);
      expect(views.length).toBe(2);
      expect(views[0].config).toEqual({ columns: ['a', 'b'] });
      expect(views[1].config).toEqual({ columns: 2 });
    });

    it('returns empty array if no views exist', async () => {
      const entity = await service.createEntity(testCompanyId, testUserId, {
        name: `no_views_${Date.now()}`,
        label: 'No Views Entity'
      });

      const views = await service.getViews(entity.id);

      expect(views).toEqual([]);
    });

    it('parses config JSON for all views', async () => {
      const entity = await service.createEntity(testCompanyId, testUserId, {
        name: `config_parse_${Date.now()}`,
        label: 'Config Parse Entity'
      });

      const config1 = { key1: 'value1', nested: { key2: 'value2' } };
      const config2 = { key3: ['a', 'b', 'c'] };

      await service.createView(entity.id, {
        name: 'View 1',
        type: 'list',
        config: config1
      });

      await service.createView(entity.id, {
        name: 'View 2',
        type: 'grid',
        config: config2
      });

      const views = await service.getViews(entity.id);

      expect(views[0].config).toEqual(config1);
      expect(views[1].config).toEqual(config2);
    });
  });

  describe('Integration: Entity with Fields and Views', () => {
    it('creates complete entity structure', async () => {
      const entity = await service.createEntity(testCompanyId, testUserId, {
        name: `complete_entity_${Date.now()}`,
        label: 'Complete Entity'
      });

      // Add fields
      await service.addField(entity.id, {
        name: 'title',
        label: 'Title',
        type: 'text',
        required: true
      });

      await service.addField(entity.id, {
        name: 'status',
        label: 'Status',
        type: 'select',
        selectOptions: [
          { value: 'draft', label: 'Draft' },
          { value: 'published', label: 'Published' }
        ]
      });

      // Add views
      await service.createView(entity.id, {
        name: 'All Items',
        type: 'list',
        config: { columns: ['title', 'status'] }
      });

      // Fetch and verify
      const fetched = await service.getEntity(entity.id);
      const views = await service.getViews(entity.id);

      expect(fetched.fields.length).toBe(2);
      expect(fetched.fields[0].name).toBe('title');
      expect(fetched.fields[1].selectOptions).toBeDefined();
      expect(views.length).toBe(1);
      expect(views[0].type).toBe('list');
    });
  });
});
