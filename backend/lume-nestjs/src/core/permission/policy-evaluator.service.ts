import { Injectable } from '@nestjs/common';
import {
  PolicyDefinition,
  PolicyCondition,
  RequestContext,
  MetadataRegistryService,
} from '@core/runtime/metadata-registry.service';

@Injectable()
export class PolicyEvaluatorService {
  constructor(private metadataRegistry: MetadataRegistryService) {}

  evaluate(
    policy: PolicyDefinition,
    context: RequestContext,
    record?: any,
  ): boolean {
    // Check RBAC roles first
    if (policy.roles && policy.roles.length > 0) {
      const hasRole =
        context.userRoles &&
        context.userRoles.some(role => policy.roles!.includes(role));
      if (!hasRole) {
        return false;
      }
    }

    // Evaluate ABAC conditions
    if (policy.conditions && policy.conditions.length > 0) {
      for (const condition of policy.conditions) {
        if (!this.evaluateCondition(condition, context, record)) {
          return false; // All conditions must be true (AND logic)
        }
      }
    }

    // If policy.deny is true, this is a deny policy
    return !policy.deny;
  }

  async canCreate(
    entityName: string,
    context: RequestContext,
  ): Promise<boolean> {
    return this.evaluateEntityAction(entityName, 'create', context);
  }

  async canRead(
    entityName: string,
    context: RequestContext,
    record?: any,
  ): Promise<boolean> {
    return this.evaluateEntityAction(entityName, 'read', context, record);
  }

  async canUpdate(
    entityName: string,
    context: RequestContext,
    record?: any,
  ): Promise<boolean> {
    return this.evaluateEntityAction(entityName, 'update', context, record);
  }

  async canDelete(
    entityName: string,
    context: RequestContext,
    record?: any,
  ): Promise<boolean> {
    return this.evaluateEntityAction(entityName, 'delete', context, record);
  }

  filterQueryForPolicies(
    entityName: string,
    context: RequestContext,
  ): Array<[string, string, any]> {
    const filters: Array<[string, string, any]> = [];
    const policies = this.metadataRegistry
      .listPolicies()
      .filter(p => p.entity === entityName && p.actions.includes('read'));

    for (const policy of policies) {
      // Skip policies without conditions (they don't filter)
      if (!policy.conditions || policy.conditions.length === 0) continue;

      for (const condition of policy.conditions) {
        const value = this.resolveContextVariable(condition.value, context);
        filters.push([condition.field, condition.operator, value]);
      }
    }

    return filters;
  }

  private evaluateEntityAction(
    entityName: string,
    action: string,
    context: RequestContext,
    record?: any,
  ): boolean {
    const policies = this.metadataRegistry
      .listPolicies()
      .filter(
        p =>
          p.entity === entityName &&
          (p.actions.includes(action) || p.actions.includes('*')),
      );

    if (policies.length === 0) {
      return false; // Deny by default if no policy matches
    }

    // Check for explicit deny policies first
    const denyPolicies = policies.filter(p => p.deny);
    for (const policy of denyPolicies) {
      if (this.evaluate(policy, context, record)) {
        return false; // Explicit deny takes precedence
      }
    }

    // Check for allow policies
    const allowPolicies = policies.filter(p => !p.deny);
    for (const policy of allowPolicies) {
      if (this.evaluate(policy, context, record)) {
        return true; // At least one allow policy matches
      }
    }

    return false; // No allow policy matched
  }

  private evaluateCondition(
    condition: PolicyCondition,
    context: RequestContext,
    record?: any,
  ): boolean {
    const contextValue = this.resolveContextVariable(
      condition.value,
      context,
    );
    const recordValue = record ? record[condition.field] : undefined;

    switch (condition.operator) {
      case '==':
        return recordValue === contextValue;
      case '!=':
        return recordValue !== contextValue;
      case 'in':
        return Array.isArray(contextValue)
          ? contextValue.includes(recordValue)
          : recordValue === contextValue;
      case 'contains':
        return String(recordValue).includes(String(contextValue));
      case '>':
        return recordValue > contextValue;
      case '<':
        return recordValue < contextValue;
      default:
        return false;
    }
  }

  private resolveContextVariable(
    value: any,
    context: RequestContext,
  ): any {
    if (typeof value === 'string') {
      if (value === '$userId') return context.userId;
      if (value === '$roleId') return context.roleId;
      if (value === '$companyId') return context.companyId;
    }
    return value;
  }
}
