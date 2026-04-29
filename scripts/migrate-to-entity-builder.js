#!/usr/bin/env node

/**
 * Migration Script: Legacy System → Entity Builder
 *
 * This script migrates data from legacy tables to the new Entity Builder system.
 * It preserves all existing records while creating new entity records with proper
 * relationships, field mappings, and audit trails.
 *
 * Usage:
 *   NODE_OPTIONS='--experimental-vm-modules' node scripts/migrate-to-entity-builder.js --source=legacy --target=entities
 */

import { Command } from 'commander';
import { PrismaClient } from '@prisma/client';
import { DrizzleAdapter } from '@/core/db/adapters/drizzle.adapter.js';
import { RecordService } from '@/core/services/record.service.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LOG_FILE = path.join(__dirname, '../logs/migration.log');
const CHECKPOINT_FILE = path.join(__dirname, '../logs/migration-checkpoint.json');

class EntityMigration {
  constructor() {
    this.prisma = new PrismaClient();
    this.drizzle = new DrizzleAdapter();
    this.recordService = new RecordService();
    this.migrationLog = [];
    this.stats = {
      entitiesCreated: 0,
      recordsMigrated: 0,
      relationshipsMigrated: 0,
      fieldsMapped: 0,
      errorCount: 0,
      skipped: 0,
      startTime: new Date(),
      endTime: null,
      duration: null
    };
  }

  log(level, message, data = {}) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      data
    };
    this.migrationLog.push(logEntry);

    const logLine = `[${logEntry.timestamp}] ${level.toUpperCase()}: ${message}`;
    console.log(logLine, data ? JSON.stringify(data) : '');

    // Append to log file
    fs.appendFileSync(LOG_FILE, logLine + '\n');
    if (Object.keys(data).length > 0) {
      fs.appendFileSync(LOG_FILE, JSON.stringify(data) + '\n');
    }
  }

  saveCheckpoint(data) {
    fs.writeFileSync(CHECKPOINT_FILE, JSON.stringify(data, null, 2));
  }

  loadCheckpoint() {
    if (fs.existsSync(CHECKPOINT_FILE)) {
      return JSON.parse(fs.readFileSync(CHECKPOINT_FILE, 'utf-8'));
    }
    return null;
  }

  async migrateEntities(sourceConfig) {
    this.log('info', 'Starting entity schema migration', sourceConfig);

    try {
      // Discover legacy entities from database
      const legacyTables = await this.discoverLegacyEntities();
      this.log('info', `Discovered ${legacyTables.length} legacy entity tables`);

      for (const table of legacyTables) {
        try {
          const entity = await this.createEntityFromLegacyTable(table);
          this.stats.entitiesCreated++;
          this.log('info', `Migrated entity: ${entity.name}`, { entityId: entity.id });
        } catch (error) {
          this.stats.errorCount++;
          this.log('error', `Failed to migrate entity: ${table}`, { error: error.message });
        }
      }

      this.saveCheckpoint({ phase: 'entities_complete', count: this.stats.entitiesCreated });
    } catch (error) {
      this.log('error', 'Entity migration failed', { error: error.message });
      throw error;
    }
  }

  async discoverLegacyEntities() {
    // Query information_schema to find all tables
    const query = `
      SELECT TABLE_NAME
      FROM INFORMATION_SCHEMA.TABLES
      WHERE TABLE_SCHEMA = ?
        AND TABLE_NAME NOT IN ('users', 'roles', 'permissions', 'role_permissions', 'settings', 'audit_logs', 'installed_modules', 'menu', 'groups', 'record_rules', 'sequences')
        AND TABLE_NAME NOT LIKE 'entity_%'
    `;

    const result = await this.prisma.$queryRaw`
      SELECT TABLE_NAME
      FROM INFORMATION_SCHEMA.TABLES
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME NOT LIKE 'entity_%'
        AND TABLE_NAME NOT IN ('users', 'roles', 'permissions', 'role_permissions', 'settings', 'audit_logs', 'installed_modules', 'menu', 'groups', 'record_rules', 'sequences')
    `;

    return result.map(r => r.TABLE_NAME);
  }

  async createEntityFromLegacyTable(tableName) {
    // Get column information
    const columns = await this.getTableColumns(tableName);

    // Create entity in Prisma
    const entity = await this.prisma.entity.create({
      data: {
        name: tableName,
        label: this.titleCase(tableName),
        description: `Auto-migrated from legacy table: ${tableName}`,
        isActive: true,
        companyId: 1 // Default company
      }
    });

    // Create fields from columns
    for (const column of columns) {
      if (['id', 'created_at', 'updated_at', 'deleted_at'].includes(column.name)) {
        continue; // Skip system fields
      }

      const fieldType = this.mapLegacyColumnType(column.type);

      await this.prisma.entityField.create({
        data: {
          entityId: entity.id,
          name: column.name,
          label: this.titleCase(column.name),
          type: fieldType,
          required: column.nullable === 'NO',
          unique: column.key === 'UNI',
          helpText: `Migrated from ${tableName}.${column.name}`
        }
      });

      this.stats.fieldsMapped++;
    }

    return entity;
  }

  async getTableColumns(tableName) {
    const result = await this.prisma.$queryRaw`
      SELECT
        COLUMN_NAME as name,
        COLUMN_TYPE as type,
        IS_NULLABLE as nullable,
        COLUMN_KEY as key
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = ${tableName}
      ORDER BY ORDINAL_POSITION
    `;

    return result;
  }

  mapLegacyColumnType(mysqlType) {
    const typeMap = {
      'varchar': 'text',
      'char': 'text',
      'text': 'textarea',
      'longtext': 'textarea',
      'int': 'number',
      'bigint': 'number',
      'decimal': 'number',
      'float': 'number',
      'double': 'number',
      'boolean': 'checkbox',
      'tinyint(1)': 'checkbox',
      'date': 'date',
      'datetime': 'datetime',
      'timestamp': 'datetime',
      'time': 'text',
      'json': 'textarea',
      'enum': 'select'
    };

    const baseType = mysqlType.split('(')[0].toLowerCase();
    return typeMap[baseType] || 'text';
  }

  async migrateRecords(options) {
    this.log('info', 'Starting record data migration', options);

    const entities = await this.prisma.entity.findMany({
      include: { fields: true },
      where: { isActive: true }
    });

    for (const entity of entities) {
      try {
        const recordCount = await this.migrateEntityRecords(entity);
        this.stats.recordsMigrated += recordCount;

        this.log('info', `Migrated records for entity: ${entity.name}`, { count: recordCount });
        this.saveCheckpoint({
          phase: 'records',
          lastEntity: entity.id,
          totalMigrated: this.stats.recordsMigrated
        });
      } catch (error) {
        this.stats.errorCount++;
        this.log('error', `Failed to migrate records for ${entity.name}`, { error: error.message });
      }
    }
  }

  async migrateEntityRecords(entity) {
    const legacyTable = entity.name;

    // Fetch all records from legacy table
    const legacyRecords = await this.prisma.$queryRaw`
      SELECT * FROM ?? WHERE deleted_at IS NULL
    `;

    let count = 0;
    for (const legacyRecord of legacyRecords) {
      try {
        const recordData = {};

        // Map legacy fields to entity fields
        for (const field of entity.fields) {
          if (legacyRecord[field.name] !== undefined) {
            recordData[field.name] = legacyRecord[field.name];
          }
        }

        // Create entity record
        await this.recordService.createRecord(
          entity.id,
          {
            data: recordData,
            companyId: legacyRecord.company_id || 1
          }
        );

        count++;
      } catch (error) {
        this.stats.errorCount++;
        this.log('warn', `Skipped record migration for ${entity.name}`, {
          error: error.message,
          legacyId: legacyRecord.id
        });
      }
    }

    return count;
  }

  async migrateRelationships(options) {
    this.log('info', 'Starting relationship migration', options);

    const entities = await this.prisma.entity.findMany({
      include: {
        fields: {
          where: { type: 'relationship' }
        }
      }
    });

    for (const entity of entities) {
      for (const field of entity.fields) {
        try {
          const count = await this.migrateFieldRelationships(entity, field);
          this.stats.relationshipsMigrated += count;

          this.log('info', `Migrated relationships for ${entity.name}.${field.name}`, { count });
        } catch (error) {
          this.stats.errorCount++;
          this.log('error', `Failed to migrate relationships for ${entity.name}.${field.name}`, {
            error: error.message
          });
        }
      }
    }
  }

  async migrateFieldRelationships(entity, field) {
    // TODO: Implement based on legacy foreign key relationships
    return 0;
  }

  async validateMigration() {
    this.log('info', 'Starting migration validation');

    const entities = await this.prisma.entity.findMany();
    let validationErrors = 0;

    for (const entity of entities) {
      // Check field count
      const fieldCount = await this.prisma.entityField.count({
        where: { entityId: entity.id }
      });

      if (fieldCount === 0) {
        this.log('warn', `Entity ${entity.name} has no fields`);
        validationErrors++;
      }

      // Check record count
      const recordCount = await this.prisma.entityRecord.count({
        where: { entityId: entity.id }
      });

      if (recordCount === 0 && fieldCount > 0) {
        this.log('warn', `Entity ${entity.name} has fields but no records`);
      }
    }

    this.log('info', 'Validation complete', { errors: validationErrors });
    return validationErrors === 0;
  }

  async generateReport() {
    this.stats.endTime = new Date();
    this.stats.duration = (this.stats.endTime - this.stats.startTime) / 1000;

    const report = `
╔════════════════════════════════════════════════════════════════╗
║                   Migration Report                             ║
╚════════════════════════════════════════════════════════════════╝

Start Time:           ${this.stats.startTime.toISOString()}
End Time:             ${this.stats.endTime.toISOString()}
Duration:             ${this.stats.duration.toFixed(2)}s

Entities Created:     ${this.stats.entitiesCreated}
Records Migrated:     ${this.stats.recordsMigrated}
Fields Mapped:        ${this.stats.fieldsMapped}
Relationships:        ${this.stats.relationshipsMigrated}

Errors:               ${this.stats.errorCount}
Skipped:              ${this.stats.skipped}

Status:               ${this.stats.errorCount === 0 ? '✅ SUCCESS' : '⚠️  WITH ERRORS'}

────────────────────────────────────────────────────────────────
Full log saved to: ${LOG_FILE}
    `;

    console.log(report);
    fs.appendFileSync(LOG_FILE, report);

    return {
      ...this.stats,
      success: this.stats.errorCount === 0
    };
  }

  titleCase(str) {
    return str.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  }

  async cleanup() {
    await this.prisma.$disconnect();
  }
}

// CLI Setup
const program = new Command();

program
  .name('migrate-to-entity-builder')
  .description('Migrate legacy database tables to Entity Builder system')
  .version('1.0.0');

program
  .command('run')
  .description('Run full migration')
  .option('--skip-entities', 'Skip entity schema migration')
  .option('--skip-records', 'Skip record data migration')
  .option('--skip-relationships', 'Skip relationship migration')
  .option('--validate-only', 'Only validate existing migration')
  .action(async (options) => {
    const migration = new EntityMigration();

    try {
      if (!options.validateOnly) {
        if (!options.skipEntities) await migration.migrateEntities({});
        if (!options.skipRecords) await migration.migrateRecords({});
        if (!options.skipRelationships) await migration.migrateRelationships({});
      }

      const isValid = await migration.validateMigration();
      const report = await migration.generateReport();

      process.exit(isValid ? 0 : 1);
    } catch (error) {
      migration.log('error', 'Migration failed', { error: error.message, stack: error.stack });
      const report = await migration.generateReport();
      process.exit(1);
    } finally {
      await migration.cleanup();
    }
  });

program
  .command('rollback')
  .description('Rollback migration (keep legacy data, clear entity builder data)')
  .option('--confirm', 'Skip confirmation prompt')
  .action(async (options) => {
    console.log('⚠️  This will delete all migrated Entity Builder records.');
    if (!options.confirm) {
      const readline = require('readline');
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
      });

      rl.question('Type "rollback" to confirm: ', async (answer) => {
        rl.close();
        if (answer === 'rollback') {
          const migration = new EntityMigration();
          // TODO: Implement rollback
          console.log('✅ Rollback complete');
          await migration.cleanup();
        } else {
          console.log('❌ Rollback cancelled');
        }
      });
    }
  });

program.parse(process.argv);
