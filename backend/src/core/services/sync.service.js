/**
 * SyncService - Code-First Loading of Entity Definitions
 *
 * Loads entity definitions from YAML files and syncs them bidirectionally with the database.
 * Enables "infrastructure-as-code" for entities - define them in code, sync to DB on startup.
 *
 * Usage:
 *   import { SyncService } from '../services/sync.service.js';
 *   import { getDrizzle } from '../db/drizzle.js';
 *   import { customEntities, entityFields, entityViews, entitySyncHistory } from '../../modules/base/models/schema.js';
 *   import { EntityService } from './entity.service.js';
 *   import { DrizzleAdapter } from '../db/adapters/drizzle-adapter.js';
 *
 *   const db = getDrizzle();
 *   const entityAdapter = new DrizzleAdapter(customEntities);
 *   const fieldsAdapter = new DrizzleAdapter(entityFields);
 *   const entityService = new EntityService(entityAdapter, fieldsAdapter);
 *   const syncService = new SyncService(entityService, db, entityViews, entitySyncHistory);
 *
 *   // Load entity definitions from YAML files
 *   const codeDefs = await syncService.loadCodeDefinitions('./src/entities');
 *
 *   // Sync to database (creates new, updates existing)
 *   const result = await syncService.syncToDb(codeDefs);
 *   console.log(result);
 *   // Output: { created: 1, updated: 0, synced: 1, errors: [] }
 *
 *   // Export entity to YAML code
 *   const yaml = await syncService.syncToCode(entityId);
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { parse as parseYAML, stringify as stringifyYAML } from 'yaml';
import { eq } from 'drizzle-orm';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export class SyncService {
  /**
   * @param {EntityService} entityService - EntityService instance
   * @param {Object} db - Drizzle database instance
   * @param {Object} viewsTable - entityViews table schema
   * @param {Object} syncHistoryTable - entitySyncHistory table schema
   */
  constructor(entityService, db, viewsTable, syncHistoryTable) {
    this.entityService = entityService;
    this.db = db;
    this.viewsTable = viewsTable;
    this.syncHistoryTable = syncHistoryTable;
  }

  /**
   * Load entity definitions from YAML files in a directory.
   *
   * Reads all .yaml and .yml files from the directory and parses them.
   * Gracefully handles missing directory (returns empty array).
   *
   * @param {string} entitiesDir - Path to directory containing .yaml/.yml files
   * @returns {Promise<Array>} Array of parsed entity definitions with _file property
   */
  async loadCodeDefinitions(entitiesDir) {
    // Check if directory exists
    if (!fs.existsSync(entitiesDir)) {
      return [];
    }

    // Read all files from directory
    const files = fs.readdirSync(entitiesDir);
    const definitions = [];

    for (const file of files) {
      // Filter for .yaml and .yml files only
      if (!file.endsWith('.yaml') && !file.endsWith('.yml')) {
        continue;
      }

      const filePath = path.join(entitiesDir, file);
      const content = fs.readFileSync(filePath, 'utf-8');

      try {
        const definition = parseYAML(content);
        definition._file = file; // Track source file
        definitions.push(definition);
      } catch (error) {
        console.error(`Error parsing ${file}:`, error.message);
      }
    }

    return definitions;
  }

  /**
   * Sync array of entity definitions to database.
   *
   * For existing entities (matched by slug): updates metadata, syncs fields/views
   * For new entities: creates entity, fields, views
   * Records sync history for each entity
   *
   * @param {Array} codeDefs - Array of entity definitions from loadCodeDefinitions()
   * @param {Object} options - Sync options
   * @param {boolean} [options.deleteOrphaned=false] - Delete entities not in codeDefs
   * @returns {Promise<Object>} Result {created, updated, synced, errors}
   */
  async syncToDb(codeDefs, options = {}) {
    const { deleteOrphaned = false } = options;
    const result = {
      created: 0,
      updated: 0,
      synced: 0,
      errors: [],
    };

    for (const codeDef of codeDefs) {
      try {
        // Check if entity exists by slug
        const existing = await this.entityService.adapter.findOne([['slug', '=', codeDef.slug]]);

        if (existing) {
          // Update existing entity metadata
          await this.entityService.updateEntity(existing.id, {
            name: codeDef.name,
            description: codeDef.description || null,
            icon: codeDef.icon || null,
            color: codeDef.color || null,
            isPublishable: codeDef.isPublishable || false,
          });

          result.updated++;

          // Sync fields for existing entity
          if (codeDef.fields && Array.isArray(codeDef.fields)) {
            await this._syncFieldsForEntity(existing.id, codeDef.fields);
          }

          // Sync views for existing entity
          if (codeDef.views && Array.isArray(codeDef.views)) {
            await this._syncViewsForEntity(existing.id, codeDef.views);
          }

          // Record sync history
          await this._recordSyncHistory(existing.id, 'code', 'update', {
            file: codeDef._file,
          }, 'synced');
        } else {
          // Create new entity
          const newEntity = await this.entityService.createEntity({
            name: codeDef.name,
            slug: codeDef.slug,
            description: codeDef.description || null,
            icon: codeDef.icon || null,
            color: codeDef.color || null,
            isPublishable: codeDef.isPublishable || false,
          });

          result.created++;

          // Create fields for new entity
          if (codeDef.fields && Array.isArray(codeDef.fields)) {
            for (const field of codeDef.fields) {
              await this.entityService.createField(newEntity.id, {
                slug: field.slug,
                name: field.name || field.slug,
                type: field.type,
                label: field.label || field.name || field.slug,
                description: field.description || null,
                required: field.required || false,
                unique: field.unique || false,
                validation: field.validation ? (typeof field.validation === 'string' ? JSON.parse(field.validation) : field.validation) : null,
                position: field.position || 0,
                defaultValue: field.defaultValue || null,
              });
            }
          }

          // Create views for new entity
          if (codeDef.views && Array.isArray(codeDef.views)) {
            await this._syncViewsForEntity(newEntity.id, codeDef.views);
          }

          // Record sync history
          await this._recordSyncHistory(newEntity.id, 'code', 'create', {
            file: codeDef._file,
          }, 'synced');
        }

        result.synced++;
      } catch (error) {
        result.errors.push({
          entity: codeDef.slug || codeDef.name,
          error: error.message,
        });
      }
    }

    return result;
  }

  /**
   * Private helper: Sync views for an entity.
   * Deletes existing views and creates new ones from definition.
   *
   * @param {number} entityId - Entity ID
   * @param {Array} viewDefs - View definitions
   * @private
   */
  async _syncViewsForEntity(entityId, viewDefs) {
    try {
      // Delete existing views for this entity
      await this.db.delete(this.viewsTable).where(eq(this.viewsTable.entityId, entityId));
    } catch (error) {
      // Skip deletion errors; continue to create new ones
      console.warn(`Error deleting existing views for entity ${entityId}:`, error.message);
    }

    // Create new views
    for (const viewDef of viewDefs) {
      try {
        await this.db.insert(this.viewsTable).values({
          entityId,
          name: viewDef.name,
          type: viewDef.type || 'list',
          isDefault: viewDef.isDefault || false,
          config: viewDef.config || {},
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      } catch (error) {
        console.error(`Error creating view for entity ${entityId}:`, error.message);
      }
    }
  }

  /**
   * Private helper: Sync fields for an entity.
   * Creates new fields from definition (updates are handled by caller).
   *
   * @param {number} entityId - Entity ID
   * @param {Array} fieldDefs - Field definitions
   * @private
   */
  async _syncFieldsForEntity(entityId, fieldDefs) {
    // Get existing fields
    const existingFields = await this.entityService.getFieldsByEntity(entityId);
    const existingFieldSlugs = new Set(existingFields.map(f => f.slug));

    // Create fields that don't exist
    for (const fieldDef of fieldDefs) {
      if (!existingFieldSlugs.has(fieldDef.slug)) {
        await this.entityService.createField(entityId, {
          slug: fieldDef.slug,
          name: fieldDef.name || fieldDef.slug,
          type: fieldDef.type,
          label: fieldDef.label || fieldDef.name || fieldDef.slug,
          description: fieldDef.description || null,
          required: fieldDef.required || false,
          unique: fieldDef.unique || false,
          validation: fieldDef.validation ? (typeof fieldDef.validation === 'string' ? JSON.parse(fieldDef.validation) : fieldDef.validation) : null,
          position: fieldDef.position || 0,
          defaultValue: fieldDef.defaultValue || null,
        });
      }
    }
  }

  /**
   * Private helper: Record sync history entry.
   *
   * @param {number} entityId - Entity ID
   * @param {string} source - Source ('code' or 'ui')
   * @param {string} action - Action ('create', 'update', 'delete')
   * @param {Object} changes - Change details
   * @param {string} status - Status ('synced', 'conflict', 'error')
   * @private
   */
  async _recordSyncHistory(entityId, source, action, changes, status) {
    try {
      await this.db.insert(this.syncHistoryTable).values({
        entityId,
        source,
        action,
        changes: changes || {},
        syncedAt: new Date(),
        status,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    } catch (error) {
      console.error('Error recording sync history:', error.message);
    }
  }

  /**
   * Export entity from database to YAML format.
   * Inverse of syncToDb - exports entity definition suitable for code-first management.
   *
   * @param {number} entityId - Entity ID
   * @returns {Promise<string>} YAML string representation of entity
   */
  async syncToCode(entityId) {
    // Get entity
    const entity = await this.entityService.getEntity(entityId);
    if (!entity) {
      throw new Error(`Entity ${entityId} not found`);
    }

    // Get fields
    const fields = await this.entityService.getFieldsByEntity(entityId);

    // Build definition object
    const definition = {
      name: entity.name,
      slug: entity.slug,
      icon: entity.icon || undefined,
      color: entity.color || undefined,
      description: entity.description || undefined,
      isPublishable: entity.isPublishable,
    };

    // Add fields if any
    if (fields.length > 0) {
      definition.fields = fields.map(field => ({
        slug: field.slug,
        name: field.name,
        type: field.type,
        label: field.label,
        ...(field.description && { description: field.description }),
        ...(field.required && { required: true }),
        ...(field.unique && { unique: true }),
        ...(field.validation && { validation: JSON.stringify(field.validation) }),
        ...(field.position && { position: field.position }),
        ...(field.defaultValue && { defaultValue: field.defaultValue }),
      }));
    }

    // Remove undefined values from definition
    Object.keys(definition).forEach(key => {
      if (definition[key] === undefined) {
        delete definition[key];
      }
    });

    // Convert to YAML
    return stringifyYAML(definition, { indent: 2 });
  }
}

export default SyncService;
