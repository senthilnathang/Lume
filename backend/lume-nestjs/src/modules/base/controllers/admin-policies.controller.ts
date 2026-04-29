import { Controller, Get, Post, Put, Delete, Body, Param, HttpCode, UseGuards } from '@nestjs/common';
import { MetadataRegistryService } from '../../../core/runtime/metadata-registry.service.js';
import { PolicyEvaluatorService } from '../../../core/permission/policy-evaluator.service.js';
import { PolicyGuard, Policy } from '../../../core/permission/policy.guard.js';
import type { PolicyDefinition } from '../../../core/permission/define-policy.js';

@Controller('admin/policies')
@UseGuards(PolicyGuard)
export class AdminPoliciesController {
  constructor(
    private readonly metadataRegistry: MetadataRegistryService,
    private readonly policyEvaluator: PolicyEvaluatorService,
  ) {}

  @Get()
  @Policy(['admin', 'super_admin'])
  async listPolicies() {
    const policies = this.metadataRegistry.listPolicies();
    return {
      success: true,
      data: policies.map((p) => ({
        name: p.name,
        entity: p.entity,
        actions: p.actions,
        conditions: p.conditions || [],
        roles: p.roles || [],
        deny: p.deny || false,
      })),
    };
  }

  @Get(':policyName')
  @Policy(['admin', 'super_admin'])
  async getPolicy(@Param('policyName') policyName: string) {
    const policy = this.metadataRegistry.getPolicy(policyName);
    if (!policy) {
      return { success: false, message: `Policy ${policyName} not found` };
    }
    return { success: true, data: policy };
  }

  @Post()
  @HttpCode(201)
  @Policy(['admin', 'super_admin'])
  async createPolicy(@Body() policyDef: PolicyDefinition) {
    try {
      this.metadataRegistry.registerPolicy(policyDef);
      return { success: true, message: 'Policy created', data: policyDef };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  @Put(':policyName')
  @Policy(['admin', 'super_admin'])
  async updatePolicy(@Param('policyName') policyName: string, @Body() updates: Partial<PolicyDefinition>) {
    try {
      const policy = this.metadataRegistry.getPolicy(policyName);
      if (!policy) {
        return { success: false, message: `Policy ${policyName} not found` };
      }

      const updated = { ...policy, ...updates, name: policyName };
      this.metadataRegistry.registerPolicy(updated);
      return { success: true, message: 'Policy updated', data: updated };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  @Delete(':policyName')
  @Policy(['admin', 'super_admin'])
  async deletePolicy(@Param('policyName') policyName: string) {
    try {
      const policy = this.metadataRegistry.getPolicy(policyName);
      if (!policy) {
        return { success: false, message: `Policy ${policyName} not found` };
      }

      this.metadataRegistry.unregisterPolicy(policyName);
      return { success: true, message: `Policy ${policyName} deleted` };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  @Post('test')
  @HttpCode(200)
  @Policy(['admin', 'super_admin'])
  async testPolicy(
    @Body()
    body: {
      policyName: string;
      userId: number;
      roleId: number;
      companyId?: number;
      action: string;
      record?: Record<string, any>;
    },
  ) {
    try {
      const policy = this.metadataRegistry.getPolicy(body.policyName);
      if (!policy) {
        return { success: false, message: `Policy ${body.policyName} not found` };
      }

      const context = {
        userId: body.userId,
        roleId: body.roleId,
        companyId: body.companyId,
      };

      const result = this.policyEvaluator.evaluate(policy, context, body.record);

      return {
        success: true,
        data: {
          policyName: body.policyName,
          action: body.action,
          allowed: result,
          context,
          conditions: policy.conditions || [],
        },
      };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  @Get('entity/:entityName')
  @Policy(['admin', 'super_admin'])
  async getPoliciesForEntity(@Param('entityName') entityName: string) {
    const policies = this.metadataRegistry.listPolicies().filter((p) => p.entity === entityName);
    return {
      success: true,
      data: {
        entity: entityName,
        policies: policies.map((p) => ({
          name: p.name,
          actions: p.actions,
          roles: p.roles,
          conditions: p.conditions,
          deny: p.deny,
        })),
      },
    };
  }
}
