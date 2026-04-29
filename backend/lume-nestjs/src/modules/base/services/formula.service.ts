import { Injectable, BadRequestException } from '@nestjs/common';
import { Expression } from 'expr-eval';

@Injectable()
export class FormulaService {
  /**
   * Evaluate a formula expression with record data
   */
  evaluate(expression: string, record: Record<string, any>, fields: any[]): any {
    try {
      let processedExpression = expression;
      const fieldMap: Record<string, any> = {};
      fields.forEach((f) => {
        fieldMap[f.name] = f;
      });

      const fieldPattern = /\{([a-zA-Z_][a-zA-Z0-9_]*)\}/g;
      const variables: Record<string, any> = {};

      processedExpression = expression.replace(fieldPattern, (match, fieldName) => {
        const value = record[fieldName];
        variables[fieldName] = value !== undefined && value !== null ? value : 0;
        return fieldName;
      });

      const expr = new Expression(processedExpression);
      return expr.evaluate(variables);
    } catch (error) {
      throw new BadRequestException(`Formula evaluation failed: ${(error as Error).message}`);
    }
  }

  /**
   * Validate a formula expression for syntax errors
   */
  validateExpression(expression: string, fields: any[]): { valid: boolean; error?: string } {
    try {
      const fieldMap: Record<string, any> = {};
      fields.forEach((f) => {
        fieldMap[f.name] = f;
      });

      let processedExpression = expression;
      const fieldPattern = /\{([a-zA-Z_][a-zA-Z0-9_]*)\}/g;

      processedExpression = expression.replace(fieldPattern, (match, fieldName) => {
        if (!fieldMap[fieldName]) {
          throw new BadRequestException(`Unknown field: ${fieldName}`);
        }
        return fieldName;
      });

      new Expression(processedExpression);
      return { valid: true };
    } catch (error) {
      return {
        valid: false,
        error: (error as Error).message,
      };
    }
  }

  /**
   * Extract field names referenced in a formula expression
   */
  getFieldDependencies(expression: string): string[] {
    const fieldPattern = /\{([a-zA-Z_][a-zA-Z0-9_]*)\}/g;
    const dependencies = new Set<string>();
    let match;

    while ((match = fieldPattern.exec(expression)) !== null) {
      dependencies.add(match[1]);
    }

    return Array.from(dependencies);
  }
}
