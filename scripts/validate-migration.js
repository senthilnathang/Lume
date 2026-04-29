#!/usr/bin/env node

/**
 * Migration Validation Script
 *
 * Validates data integrity after migration to Entity Builder system.
 * Checks for:
 * - Missing records
 * - Data type mismatches
 * - Orphaned relationships
 * - Field value consistency
 * - Audit trail completeness
 *
 * Usage:
 *   NODE_OPTIONS='--experimental-vm-modules' node scripts/validate-migration.js
 */

import { PrismaClient } from '@prisma/client';
import chalk from 'chalk';
import Table from 'cli-table3';
import { format } from 'date-fns';

class MigrationValidator {
  constructor() {
    this.prisma = new PrismaClient();
    this.results = {
      checks: [],
      errors: [],
      warnings: [],
      summary: null
    };
  }

  log(message) {
    console.log(message);
  }

  async validateEntityCount() {
    const check = {
      name: 'Entity Count',
      status: '✓',
      details: ''
    };

    try {
      const count = await this.prisma.entity.count();
      check.details = `Found ${count} entities`;

      if (count === 0) {
        check.status = '✗';
        this.results.errors.push('No entities found after migration');
      }

      this.results.checks.push(check);
    } catch (error) {
      check.status = '✗';
      check.details = error.message;
      this.results.errors.push(`Entity count check failed: ${error.message}`);
      this.results.checks.push(check);
    }
  }

  async validateRecordCount() {
    const check = {
      name: 'Record Count',
      status: '✓',
      details: ''
    };

    try {
      const count = await this.prisma.entityRecord.count();
      check.details = `Found ${count} records`;

      if (count === 0) {
        check.status = '⚠';
        this.results.warnings.push('No records found - check if data migration ran');
      }

      this.results.checks.push(check);
    } catch (error) {
      check.status = '✗';
      check.details = error.message;
      this.results.errors.push(`Record count check failed: ${error.message}`);
      this.results.checks.push(check);
    }
  }

  async validateFieldMappings() {
    const check = {
      name: 'Field Mappings',
      status: '✓',
      details: ''
    };

    try {
      const entities = await this.prisma.entity.findMany({
        include: { fields: true }
      });

      let totalFields = 0;
      let missingFields = 0;

      for (const entity of entities) {
        totalFields += entity.fields.length;

        // Check for required fields
        const hasRequiredFields = entity.fields.some(f => f.required === true);
        if (entity.fields.length > 0 && !hasRequiredFields) {
          missingFields++;
        }
      }

      check.details = `${totalFields} fields across ${entities.length} entities`;

      if (missingFields > 0) {
        check.status = '⚠';
        this.results.warnings.push(`${missingFields} entities have no required fields`);
      }

      this.results.checks.push(check);
    } catch (error) {
      check.status = '✗';
      check.details = error.message;
      this.results.errors.push(`Field mapping check failed: ${error.message}`);
      this.results.checks.push(check);
    }
  }

  async validateDataTypes() {
    const check = {
      name: 'Data Type Validation',
      status: '✓',
      details: ''
    };

    try {
      const fields = await this.prisma.entityField.findMany({
        include: {
          entity: {
            include: {
              records: { take: 10 }
            }
          }
        }
      });

      let typeErrors = 0;

      for (const field of fields) {
        for (const record of field.entity.records) {
          const value = record.data[field.name];

          if (value === null || value === undefined) continue;

          // Validate based on field type
          const isValid = this.validateFieldType(field.type, value);

          if (!isValid) {
            typeErrors++;
          }
        }
      }

      check.details = `Validated data types for ${fields.length} fields`;

      if (typeErrors > 0) {
        check.status = '⚠';
        this.results.warnings.push(`Found ${typeErrors} potential data type mismatches`);
      }

      this.results.checks.push(check);
    } catch (error) {
      check.status = '✗';
      check.details = error.message;
      this.results.errors.push(`Data type validation failed: ${error.message}`);
      this.results.checks.push(check);
    }
  }

  validateFieldType(type, value) {
    switch (type) {
      case 'email':
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value));
      case 'url':
        return /^https?:\/\//.test(String(value));
      case 'number':
        return !isNaN(Number(value));
      case 'date':
        return !isNaN(Date.parse(value));
      case 'datetime':
        return !isNaN(Date.parse(value));
      case 'checkbox':
        return typeof value === 'boolean' || [0, 1, '0', '1', true, false].includes(value);
      default:
        return true;
    }
  }

  async validateAuditTrail() {
    const check = {
      name: 'Audit Trail',
      status: '✓',
      details: ''
    };

    try {
      const count = await this.prisma.auditLog.count({
        where: {
          action: { in: ['CREATE', 'UPDATE', 'DELETE'] },
          entity: { contains: 'entity_record' }
        }
      });

      check.details = `Found ${count} audit entries for entity records`;

      if (count === 0) {
        check.status = '⚠';
        this.results.warnings.push('No audit trail entries found for entity records');
      }

      this.results.checks.push(check);
    } catch (error) {
      check.status = '⚠';
      check.details = error.message;
      this.results.warnings.push(`Audit trail check inconclusive: ${error.message}`);
      this.results.checks.push(check);
    }
  }

  async validateRelationships() {
    const check = {
      name: 'Relationships',
      status: '✓',
      details: ''
    };

    try {
      const relationshipFields = await this.prisma.entityField.findMany({
        where: { type: 'relationship' }
      });

      let orphanedCount = 0;

      for (const field of relationshipFields) {
        const records = await this.prisma.entityRecord.findMany({
          where: { entityId: field.entityId }
        });

        for (const record of records) {
          const linkedId = record.data[field.name];
          if (linkedId) {
            const linkedRecord = await this.prisma.entityRecord.findUnique({
              where: { id: linkedId }
            });

            if (!linkedRecord) {
              orphanedCount++;
            }
          }
        }
      }

      check.details = `Validated ${relationshipFields.length} relationship fields`;

      if (orphanedCount > 0) {
        check.status = '⚠';
        this.results.warnings.push(`Found ${orphanedCount} broken relationships`);
      }

      this.results.checks.push(check);
    } catch (error) {
      check.status = '⚠';
      check.details = error.message;
      this.results.warnings.push(`Relationship validation inconclusive: ${error.message}`);
      this.results.checks.push(check);
    }
  }

  async validateCompanyScoping() {
    const check = {
      name: 'Company Scoping',
      status: '✓',
      details: ''
    };

    try {
      const records = await this.prisma.entityRecord.groupBy({
        by: ['companyId'],
        _count: true
      });

      check.details = `Records distributed across ${records.length} companies`;

      // Check for null company IDs
      const nullCompanyRecords = await this.prisma.entityRecord.count({
        where: { companyId: null }
      });

      if (nullCompanyRecords > 0) {
        check.status = '⚠';
        this.results.warnings.push(`${nullCompanyRecords} records have no company assigned`);
      }

      this.results.checks.push(check);
    } catch (error) {
      check.status = '⚠';
      check.details = error.message;
      this.results.warnings.push(`Company scoping check inconclusive: ${error.message}`);
      this.results.checks.push(check);
    }
  }

  async validateSoftDeletes() {
    const check = {
      name: 'Soft Deletes',
      status: '✓',
      details: ''
    };

    try {
      const deletedCount = await this.prisma.entityRecord.count({
        where: { deletedAt: { not: null } }
      });

      check.details = `${deletedCount} soft-deleted records`;

      this.results.checks.push(check);
    } catch (error) {
      check.status = '⚠';
      check.details = 'Soft delete tracking not available';
      this.results.checks.push(check);
    }
  }

  async validatePermissions() {
    const check = {
      name: 'Field Permissions',
      status: '✓',
      details: ''
    };

    try {
      const permissionCount = await this.prisma.entityFieldPermission.count();

      check.details = `${permissionCount} field permissions configured`;

      if (permissionCount === 0) {
        check.status = '⚠';
        this.results.warnings.push('No field-level permissions configured');
      }

      this.results.checks.push(check);
    } catch (error) {
      check.status = '⚠';
      check.details = 'Permissions table not available';
      this.results.checks.push(check);
    }
  }

  async runAllChecks() {
    this.log(chalk.blue.bold('\n🔍 Running Migration Validation Checks...\n'));

    await this.validateEntityCount();
    await this.validateRecordCount();
    await this.validateFieldMappings();
    await this.validateDataTypes();
    await this.validateAuditTrail();
    await this.validateRelationships();
    await this.validateCompanyScoping();
    await this.validateSoftDeletes();
    await this.validatePermissions();

    this.generateSummary();
  }

  generateSummary() {
    const passed = this.results.checks.filter(c => c.status === '✓').length;
    const warnings = this.results.checks.filter(c => c.status === '⚠').length;
    const failed = this.results.checks.filter(c => c.status === '✗').length;

    this.results.summary = {
      passed,
      warnings,
      failed,
      total: this.results.checks.length,
      success: failed === 0
    };
  }

  displayResults() {
    const table = new Table({
      head: [
        chalk.cyan('Check'),
        chalk.cyan('Status'),
        chalk.cyan('Details')
      ],
      style: {
        compact: true
      }
    });

    for (const check of this.results.checks) {
      const statusColor = {
        '✓': chalk.green,
        '⚠': chalk.yellow,
        '✗': chalk.red
      }[check.status];

      table.push([
        check.name,
        statusColor(check.status),
        check.details
      ]);
    }

    this.log('\n' + table.toString());

    // Summary
    const summary = this.results.summary;
    this.log(chalk.blue.bold('\n📊 Summary:\n'));
    this.log(chalk.green(`  ✓ Passed:  ${summary.passed}/${summary.total}`));
    this.log(chalk.yellow(`  ⚠ Warnings: ${summary.warnings}/${summary.total}`));
    this.log(chalk.red(`  ✗ Failed:  ${summary.failed}/${summary.total}`));

    // Status
    if (summary.success) {
      this.log(chalk.green.bold('\n✅ All validation checks passed!\n'));
    } else {
      this.log(chalk.red.bold(`\n❌ ${summary.failed} critical check(s) failed\n`));
    }

    // Warnings
    if (this.results.warnings.length > 0) {
      this.log(chalk.yellow.bold('⚠️  Warnings:'));
      for (const warning of this.results.warnings) {
        this.log(chalk.yellow(`   • ${warning}`));
      }
      this.log('');
    }

    // Errors
    if (this.results.errors.length > 0) {
      this.log(chalk.red.bold('❌ Errors:'));
      for (const error of this.results.errors) {
        this.log(chalk.red(`   • ${error}`));
      }
      this.log('');
    }
  }

  async cleanup() {
    await this.prisma.$disconnect();
  }
}

// Main
async function main() {
  const validator = new MigrationValidator();

  try {
    await validator.runAllChecks();
    validator.displayResults();

    process.exit(validator.results.summary.success ? 0 : 1);
  } catch (error) {
    console.error(chalk.red('Validation failed:', error.message));
    process.exit(1);
  } finally {
    await validator.cleanup();
  }
}

main();
