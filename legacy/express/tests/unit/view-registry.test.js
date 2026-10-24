import { jest } from '@jest/globals';
import { BaseViewAdapter, ViewRegistry } from '../../src/core/services/view-registry.js';

/**
 * MockAdapter — A minimal implementation of BaseViewAdapter for testing
 */
class MockAdapter extends BaseViewAdapter {
  render() {
    return {
      component: 'MockView',
      props: {
        entity: this.entity,
        fields: this.fields,
        config: this.config,
      },
    };
  }

  getSchema() {
    return {
      requiredFields: ['id', 'name'],
      optionalFields: ['description', 'status'],
      configSchema: {
        pageSize: { type: 'number', default: 10 },
        sortBy: { type: 'string', default: 'id' },
      },
    };
  }

  validate() {
    const errors = [];
    if (!this.entity) {
      errors.push('entity is required');
    }
    if (!Array.isArray(this.fields) || this.fields.length === 0) {
      errors.push('fields must be a non-empty array');
    }
    return errors;
  }
}

/**
 * AnotherMockAdapter — A second mock adapter for testing multiple registrations
 */
class AnotherMockAdapter extends BaseViewAdapter {
  render() {
    return {
      component: 'GridView',
      props: {
        entity: this.entity,
        fields: this.fields,
      },
    };
  }

  getSchema() {
    return {
      requiredFields: ['id'],
      optionalFields: [],
      configSchema: {},
    };
  }

  validate() {
    return [];
  }
}

/**
 * InvalidAdapter — A class that does NOT extend BaseViewAdapter
 */
class InvalidAdapter {
  constructor(entity, fields, config) {
    this.entity = entity;
    this.fields = fields;
    this.config = config;
  }
}

describe('BaseViewAdapter', () => {
  test('throws error when render() is not implemented', () => {
    const adapter = new BaseViewAdapter('test_entity', []);
    expect(() => adapter.render()).toThrow('render() must be implemented');
  });

  test('throws error when getSchema() is not implemented', () => {
    const adapter = new BaseViewAdapter('test_entity', []);
    expect(() => adapter.getSchema()).toThrow('getSchema() must be implemented');
  });

  test('throws error when validate() is not implemented', () => {
    const adapter = new BaseViewAdapter('test_entity', []);
    expect(() => adapter.validate()).toThrow('validate() must be implemented');
  });

  test('stores constructor parameters', () => {
    const fields = ['id', 'name', 'email'];
    const config = { pageSize: 20 };
    const adapter = new MockAdapter('users', fields, config);

    expect(adapter.entity).toBe('users');
    expect(adapter.fields).toEqual(fields);
    expect(adapter.config).toEqual(config);
  });
});

describe('ViewRegistry', () => {
  let registry;

  beforeEach(() => {
    registry = new ViewRegistry();
  });

  describe('register()', () => {
    test('registers a valid view adapter', () => {
      expect(() => {
        registry.register('list', MockAdapter);
      }).not.toThrow();

      expect(registry.views.has('list')).toBe(true);
    });

    test('throws error when adapter does not extend BaseViewAdapter', () => {
      expect(() => {
        registry.register('invalid', InvalidAdapter);
      }).toThrow('invalid must extend BaseViewAdapter');
    });

    test('allows registering multiple adapters', () => {
      registry.register('list', MockAdapter);
      registry.register('grid', AnotherMockAdapter);

      expect(registry.views.size).toBe(2);
      expect(registry.views.has('list')).toBe(true);
      expect(registry.views.has('grid')).toBe(true);
    });

    test('allows overwriting existing adapter', () => {
      registry.register('list', MockAdapter);
      registry.register('list', AnotherMockAdapter);

      const adapter = registry.resolve('list', 'test', []);
      expect(adapter).toBeInstanceOf(AnotherMockAdapter);
    });
  });

  describe('resolve()', () => {
    beforeEach(() => {
      registry.register('list', MockAdapter);
      registry.register('grid', AnotherMockAdapter);
    });

    test('returns instantiated adapter for registered type', () => {
      const entity = 'contacts';
      const fields = ['id', 'name', 'email'];
      const config = { pageSize: 20 };

      const adapter = registry.resolve('list', entity, fields, config);

      expect(adapter).toBeInstanceOf(MockAdapter);
      expect(adapter.entity).toBe(entity);
      expect(adapter.fields).toEqual(fields);
      expect(adapter.config).toEqual(config);
    });

    test('throws error for unregistered view type', () => {
      expect(() => {
        registry.resolve('kanban', 'test_entity', []);
      }).toThrow("View type 'kanban' not registered");
    });

    test('returns correct adapter instance for each type', () => {
      const listAdapter = registry.resolve('list', 'test', []);
      const gridAdapter = registry.resolve('grid', 'test', []);

      expect(listAdapter).toBeInstanceOf(MockAdapter);
      expect(gridAdapter).toBeInstanceOf(AnotherMockAdapter);
    });

    test('handles empty fields array', () => {
      const adapter = registry.resolve('list', 'test', []);
      expect(adapter.fields).toEqual([]);
    });

    test('handles default empty config', () => {
      const adapter = registry.resolve('list', 'test', []);
      expect(adapter.config).toEqual({});
    });
  });

  describe('getAvailableTypes()', () => {
    test('returns empty array when no adapters registered', () => {
      const types = registry.getAvailableTypes();
      expect(Array.isArray(types)).toBe(true);
      expect(types.length).toBe(0);
    });

    test('returns array of registered type names', () => {
      registry.register('list', MockAdapter);
      registry.register('grid', AnotherMockAdapter);

      const types = registry.getAvailableTypes();

      expect(types.length).toBe(2);
      expect(types).toContain('list');
      expect(types).toContain('grid');
    });

    test('returns types in consistent order', () => {
      registry.register('list', MockAdapter);
      registry.register('grid', AnotherMockAdapter);
      registry.register('kanban', MockAdapter);

      const types1 = registry.getAvailableTypes();
      const types2 = registry.getAvailableTypes();

      expect(types1).toEqual(types2);
    });
  });

  describe('createViewConfig()', () => {
    beforeEach(() => {
      registry.register('list', MockAdapter);
    });

    test('creates valid view configuration', () => {
      const entity = 'contacts';
      const fields = ['id', 'name', 'email'];
      const viewType = 'list';
      const options = { pageSize: 20 };

      const config = registry.createViewConfig(entity, fields, viewType, options);

      expect(config).toEqual(
        expect.objectContaining({
          type: viewType,
          config: expect.objectContaining({
            entity,
            fields,
            pageSize: 20,
          }),
          schema: expect.any(Object),
        })
      );
    });

    test('includes schema in view config', () => {
      const config = registry.createViewConfig('test', ['id'], 'list');

      expect(config.schema).toEqual(
        expect.objectContaining({
          requiredFields: expect.any(Array),
          optionalFields: expect.any(Array),
          configSchema: expect.any(Object),
        })
      );
    });

    test('includes validation results in config', () => {
      const config = registry.createViewConfig('test', ['id'], 'list');

      expect(config).toEqual(
        expect.objectContaining({
          valid: expect.any(Boolean),
          errors: expect.any(Array),
        })
      );
    });

    test('marks valid configuration when validation passes', () => {
      const config = registry.createViewConfig('contacts', ['id', 'name'], 'list');

      expect(config.valid).toBe(true);
      expect(config.errors).toEqual([]);
    });

    test('marks invalid configuration when validation fails', () => {
      const config = registry.createViewConfig('', [], 'list');

      expect(config.valid).toBe(false);
      expect(config.errors.length).toBeGreaterThan(0);
    });

    test('throws error for unregistered view type', () => {
      expect(() => {
        registry.createViewConfig('test', ['id'], 'nonexistent');
      }).toThrow("View type 'nonexistent' not registered");
    });

    test('merges options into config', () => {
      const options = { pageSize: 50, sortBy: 'name' };
      const config = registry.createViewConfig('users', ['id'], 'list', options);

      expect(config.config.pageSize).toBe(50);
      expect(config.config.sortBy).toBe('name');
    });
  });

  describe('constructor', () => {
    test('initializes with empty Map', () => {
      const newRegistry = new ViewRegistry();
      expect(newRegistry.views).toBeInstanceOf(Map);
      expect(newRegistry.views.size).toBe(0);
    });
  });

  describe('integration', () => {
    test('full workflow: register, resolve, render, validate', () => {
      registry.register('list', MockAdapter);

      const entity = 'products';
      const fields = ['id', 'name', 'price', 'stock'];
      const config = { pageSize: 25, sortBy: 'name' };

      const adapter = registry.resolve('list', entity, fields, config);
      const rendered = adapter.render();
      const validated = adapter.validate();

      expect(rendered).toEqual(
        expect.objectContaining({
          component: 'MockView',
          props: expect.objectContaining({
            entity,
            fields,
            config,
          }),
        })
      );

      expect(validated).toEqual([]);
    });

    test('createViewConfig returns ready-to-use configuration', () => {
      registry.register('grid', AnotherMockAdapter);

      const result = registry.createViewConfig('companies', ['id', 'name', 'industry'], 'grid', {
        pageSize: 50,
      });

      expect(result.type).toBe('grid');
      expect(result.config.entity).toBe('companies');
      expect(result.valid).toBe(true);
      expect(result.schema).toBeDefined();
    });
  });
});
