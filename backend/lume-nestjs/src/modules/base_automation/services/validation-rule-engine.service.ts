import { Injectable } from '@nestjs/common';
import { DrizzleService } from '@core/services/drizzle.service';
import { PrismaService } from '@core/services/prisma.service';
import { automationValidationRules } from '../models/schema';
import { eq } from 'drizzle-orm';

export interface ValidationError {
  field?: string;
  message: string;
  ruleName?: string;
}

@Injectable()
export class ValidationRuleEngineService {
  private db: any;

  constructor(
    private drizzle: DrizzleService,
    private prisma: PrismaService,
  ) {
    this.db = drizzle.getDrizzle();
  }

  async validate(modelName: string, data: Record<string, any>): Promise<ValidationError[]> {
    const errors: ValidationError[] = [];

    try {
      // Get all active validation rules for this model
      const rules = await this.db
        .select()
        .from(automationValidationRules)
        .where(eq(automationValidationRules.status, 'active'));

      const applicableRules = rules.filter((rule: any) => rule.model === modelName);

      // Sort by priority and evaluate each rule
      const sortedRules = applicableRules.sort((a: any, b: any) => (a.priority || 10) - (b.priority || 10));

      for (const rule of sortedRules) {
        const ruleErrors = await this.validateRule(rule, data);
        errors.push(...ruleErrors);
      }
    } catch (error: any) {
      console.error(`Validation rule execution failed for model ${modelName}: ${error.message}`);
    }

    return errors;
  }

  private async validateRule(rule: any, data: Record<string, any>): Promise<ValidationError[]> {
    const errors: ValidationError[] = [];
    const { ruleType, config, field, errorMessage, name } = rule;

    try {
      switch (ruleType) {
        case 'required':
          if (field && (data[field] === undefined || data[field] === null || data[field] === '')) {
            errors.push({
              field,
              message: errorMessage || `${field} is required`,
              ruleName: name,
            });
          }
          break;

        case 'format':
          if (field && data[field] !== undefined && data[field] !== null && data[field] !== '') {
            const format = config?.format || 'email';
            if (!this.validateFormat(String(data[field]), format)) {
              errors.push({
                field,
                message: errorMessage || `${field} format is invalid`,
                ruleName: name,
              });
            }
          }
          break;

        case 'range':
          if (field && data[field] !== undefined && data[field] !== null) {
            const value = Number(data[field]);
            const min = config?.min;
            const max = config?.max;
            if ((min !== undefined && value < min) || (max !== undefined && value > max)) {
              errors.push({
                field,
                message: errorMessage || `${field} must be between ${min} and ${max}`,
                ruleName: name,
              });
            }
          }
          break;

        case 'unique':
          if (field && data[field] !== undefined && data[field] !== null) {
            const model = config?.model;
            if (model) {
              const isDuplicate = await this.checkUnique(model, field, data[field]);
              if (isDuplicate) {
                errors.push({
                  field,
                  message: errorMessage || `${field} must be unique`,
                  ruleName: name,
                });
              }
            }
          }
          break;

        case 'regex':
          if (field && data[field] !== undefined && data[field] !== null && data[field] !== '') {
            const pattern = config?.pattern;
            if (pattern) {
              const regex = new RegExp(pattern);
              if (!regex.test(String(data[field]))) {
                errors.push({
                  field,
                  message: errorMessage || `${field} does not match required pattern`,
                  ruleName: name,
                });
              }
            }
          }
          break;

        case 'custom':
          // Custom validation with condition evaluation
          if (config?.condition && !this.evaluateCondition(config.condition, data)) {
            errors.push({
              field,
              message: errorMessage || 'Custom validation failed',
              ruleName: name,
            });
          }
          break;

        default:
          console.warn(`Unknown validation rule type: ${ruleType}`);
      }
    } catch (error: any) {
      console.error(`Validation rule ${name} failed: ${error.message}`);
    }

    return errors;
  }

  private validateFormat(value: string, format: string): boolean {
    switch (format) {
      case 'email':
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
      case 'url':
        try {
          new URL(value);
          return true;
        } catch {
          return false;
        }
      case 'phone':
        return /^\+?[\d\s\-().]{7,20}$/.test(value);
      case 'date':
        return !isNaN(Date.parse(value)) && /^\d{4}-\d{2}-\d{2}/.test(value);
      case 'datetime':
        return !isNaN(Date.parse(value));
      case 'uuid':
        return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
      default:
        return true;
    }
  }

  private async checkUnique(modelName: string, fieldName: string, value: any): Promise<boolean> {
    try {
      // Basic unique check - would need entity mapping in production
      // For now, return false (allow non-unique) to avoid errors
      return false;
    } catch {
      return false;
    }
  }

  private evaluateCondition(condition: any, data: Record<string, any>): boolean {
    if (!condition || Object.keys(condition).length === 0) {
      return true;
    }

    for (const [field, value] of Object.entries(condition)) {
      if (typeof value === 'object' && value !== null) {
        const op = Object.keys(value)[0];
        const opValue = (value as any)[op];

        switch (op) {
          case '$eq':
            if (data[field] !== opValue) return false;
            break;
          case '$ne':
            if (data[field] === opValue) return false;
            break;
          case '$gt':
            if (!(data[field] > opValue)) return false;
            break;
          case '$lt':
            if (!(data[field] < opValue)) return false;
            break;
          case '$in':
            if (!Array.isArray(opValue) || !opValue.includes(data[field])) return false;
            break;
          default:
            return false;
        }
      } else {
        if (data[field] !== value) return false;
      }
    }

    return true;
  }
}
