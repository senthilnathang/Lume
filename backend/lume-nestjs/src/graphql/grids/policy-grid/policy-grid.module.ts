import { Module } from '@nestjs/common';
import { RoleResolver } from './resolvers/role.resolver';
import { PermissionResolver } from './resolvers/permission.resolver';
import { FieldPermissionResolver } from './resolvers/field-permission.resolver';
import { RecordRuleResolver } from './resolvers/record-rule.resolver';

/**
 * PolicyGrid module for RBAC/ABAC governance
 * Provides queries and mutations for managing roles, permissions, field-level access, and record rules
 */
@Module({
  providers: [
    RoleResolver,
    PermissionResolver,
    FieldPermissionResolver,
    RecordRuleResolver,
  ],
  exports: [
    RoleResolver,
    PermissionResolver,
    FieldPermissionResolver,
    RecordRuleResolver,
  ],
})
export class PolicyGridModule {}
