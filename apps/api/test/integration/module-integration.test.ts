import { describe, it, expect, beforeAll } from '@jest/globals';
import { ModuleLoaderService } from '../../src/core/module/module-loader.service.js';
import { MetadataRegistryService } from '../../src/core/runtime/metadata-registry.service.js';
import { EventBusService } from '../../src/core/runtime/event-bus.service.js';
import { EntityRegistryService } from '../../src/core/entity/entity-registry.service.js';
import { WorkflowExecutorService } from '../../src/core/workflow/workflow-executor.service.js';
import { PolicyEvaluatorService } from '../../src/core/permission/policy-evaluator.service.js';
import { QueryBuilderService } from '../../src/core/query/query-builder.service.js';
import {
  planModuleLoading,
  validateModuleCompatibility,
  resolveModuleOrder,
} from '../../src/core/module/module-wiring.js';

/**
 * Integration tests for module loading and wiring
 * Verifies that example modules can be loaded and work together
 */
describe('Module Integration', () => {
  let moduleLoader: ModuleLoaderService;
  let metadataRegistry: MetadataRegistryService;
  let eventBus: EventBusService;
  let entityRegistry: EntityRegistryService;
  let workflowExecutor: WorkflowExecutorService;
  let policyEvaluator: PolicyEvaluatorService;
  let queryBuilder: QueryBuilderService;

  beforeAll(async () => {
    // Initialize services
    metadataRegistry = new MetadataRegistryService();
    eventBus = new EventBusService();
    entityRegistry = new EntityRegistryService(metadataRegistry);
    workflowExecutor = new WorkflowExecutorService(metadataRegistry, eventBus);
    policyEvaluator = new PolicyEvaluatorService(metadataRegistry);
    queryBuilder = new QueryBuilderService();
    moduleLoader = new ModuleLoaderService(
      metadataRegistry,
      entityRegistry,
      workflowExecutor,
      policyEvaluator,
    );
  });

  describe('Module Wiring', () => {
    it('should validate module compatibility', async () => {
      const { CRMModule } = await import('../../examples/crm-module.example.js');
      const { ECommerceModule } = await import('../../examples/ecommerce-module.example.js');

      const errors = validateModuleCompatibility([CRMModule, ECommerceModule]);
      expect(errors).toHaveLength(0);
    });

    it('should resolve module load order with dependencies', async () => {
      const { CRMModule } = await import('../../examples/crm-module.example.js');
      const { ECommerceModule } = await import('../../examples/ecommerce-module.example.js');

      const modules = [CRMModule, ECommerceModule];
      const ordered = resolveModuleOrder(modules);

      expect(ordered).toHaveLength(2);
      // Both depend on 'base', but that's handled at load time
    });

    it('should create a module loading plan', async () => {
      const { CRMModule } = await import('../../examples/crm-module.example.js');
      const { ECommerceModule } = await import('../../examples/ecommerce-module.example.js');

      const plan = planModuleLoading([CRMModule, ECommerceModule], []);

      expect(plan.modules).toHaveLength(2);
      expect(plan.errors).toHaveLength(0);
      expect(plan.loadOrder).toContain('crm');
      expect(plan.loadOrder).toContain('ecommerce');
    });
  });

  describe('CRM Module Integration', () => {
    it('should load CRM module successfully', async () => {
      const { CRMModule } = await import('../../examples/crm-module.example.js');

      await moduleLoader.loadModule(CRMModule);

      const crmModule = metadataRegistry.getModule('crm');
      expect(crmModule).toBeDefined();
      expect(crmModule.version).toBe('2.0.0');
    });

    it('should register CRM entities', async () => {
      const { CRMModule } = await import('../../examples/crm-module.example.js');

      await moduleLoader.loadModule(CRMModule);

      const leadEntity = metadataRegistry.getEntity('Lead');
      const contactEntity = metadataRegistry.getEntity('Contact');
      const opportunityEntity = metadataRegistry.getEntity('Opportunity');

      expect(leadEntity).toBeDefined();
      expect(contactEntity).toBeDefined();
      expect(opportunityEntity).toBeDefined();
    });

    it('should register CRM workflows', async () => {
      const { CRMModule } = await import('../../examples/crm-module.example.js');

      await moduleLoader.loadModule(CRMModule);

      const assignmentWf = metadataRegistry.getWorkflow('lead-assignment');
      const scoringWf = metadataRegistry.getWorkflow('lead-scoring');
      const nurturingWf = metadataRegistry.getWorkflow('opportunity-nurturing');

      expect(assignmentWf).toBeDefined();
      expect(scoringWf).toBeDefined();
      expect(nurturingWf).toBeDefined();
    });

    it('should register CRM policies', async () => {
      const { CRMModule } = await import('../../examples/crm-module.example.js');

      await moduleLoader.loadModule(CRMModule);

      const viewerPolicy = metadataRegistry.getPolicy('lead-viewer-policy');
      const writerPolicy = metadataRegistry.getPolicy('lead-owner-write-policy');
      const adminPolicy = metadataRegistry.getPolicy('admin-all-access');

      expect(viewerPolicy).toBeDefined();
      expect(writerPolicy).toBeDefined();
      expect(adminPolicy).toBeDefined();
    });

    it('should have computed fields on CRM entities', async () => {
      const { CRMModule } = await import('../../examples/crm-module.example.js');

      await moduleLoader.loadModule(CRMModule);

      const leadEntity = metadataRegistry.getEntity('Lead');
      expect(leadEntity.computed).toBeDefined();
      expect(leadEntity.computed.fullName).toBeDefined();
      expect(leadEntity.computed.qualificationScore).toBeDefined();
    });
  });

  describe('E-Commerce Module Integration', () => {
    it('should load e-commerce module successfully', async () => {
      const { ECommerceModule } = await import('../../examples/ecommerce-module.example.js');

      await moduleLoader.loadModule(ECommerceModule);

      const ecomModule = metadataRegistry.getModule('ecommerce');
      expect(ecomModule).toBeDefined();
      expect(ecomModule.version).toBe('2.0.0');
    });

    it('should register e-commerce entities', async () => {
      const { ECommerceModule } = await import('../../examples/ecommerce-module.example.js');

      await moduleLoader.loadModule(ECommerceModule);

      const productEntity = metadataRegistry.getEntity('Product');
      const orderEntity = metadataRegistry.getEntity('Order');

      expect(productEntity).toBeDefined();
      expect(orderEntity).toBeDefined();
    });

    it('should have inventory tracking computed fields', async () => {
      const { ECommerceModule } = await import('../../examples/ecommerce-module.example.js');

      await moduleLoader.loadModule(ECommerceModule);

      const productEntity = metadataRegistry.getEntity('Product');
      expect(productEntity.computed.availableQuantity).toBeDefined();
      expect(productEntity.computed.marginPercentage).toBeDefined();
      expect(productEntity.computed.isLowStock).toBeDefined();
    });
  });

  describe('Project Management Module Integration', () => {
    it('should load project management module successfully', async () => {
      const { ProjectManagementModule } = await import('../../examples/project-management-module.example.js');

      await moduleLoader.loadModule(ProjectManagementModule);

      const pmModule = metadataRegistry.getModule('project-management');
      expect(pmModule).toBeDefined();
      expect(pmModule.version).toBe('2.0.0');
    });

    it('should register project management entities', async () => {
      const { ProjectManagementModule } = await import('../../examples/project-management-module.example.js');

      await moduleLoader.loadModule(ProjectManagementModule);

      const projectEntity = metadataRegistry.getEntity('Project');
      const taskEntity = metadataRegistry.getEntity('Task');
      const timeEntryEntity = metadataRegistry.getEntity('TimeEntry');

      expect(projectEntity).toBeDefined();
      expect(taskEntity).toBeDefined();
      expect(timeEntryEntity).toBeDefined();
    });
  });

  describe('Cross-Module Integration', () => {
    it('should load all three example modules together', async () => {
      const { CRMModule } = await import('../../examples/crm-module.example.js');
      const { ECommerceModule } = await import('../../examples/ecommerce-module.example.js');
      const { ProjectManagementModule } = await import('../../examples/project-management-module.example.js');

      await moduleLoader.loadModule(CRMModule);
      await moduleLoader.loadModule(ECommerceModule);
      await moduleLoader.loadModule(ProjectManagementModule);

      const modules = metadataRegistry.listModules();
      expect(modules).toContainEqual(expect.objectContaining({ name: 'crm' }));
      expect(modules).toContainEqual(expect.objectContaining({ name: 'ecommerce' }));
      expect(modules).toContainEqual(expect.objectContaining({ name: 'project-management' }));
    });

    it('should have all entities registered', async () => {
      const { CRMModule } = await import('../../examples/crm-module.example.js');
      const { ECommerceModule } = await import('../../examples/ecommerce-module.example.js');
      const { ProjectManagementModule } = await import('../../examples/project-management-module.example.js');

      await moduleLoader.loadModule(CRMModule);
      await moduleLoader.loadModule(ECommerceModule);
      await moduleLoader.loadModule(ProjectManagementModule);

      const entities = metadataRegistry.listEntities();
      const entityNames = entities.map((e) => e.name);

      // CRM entities
      expect(entityNames).toContain('Lead');
      expect(entityNames).toContain('Contact');
      expect(entityNames).toContain('Opportunity');

      // E-Commerce entities
      expect(entityNames).toContain('Product');
      expect(entityNames).toContain('Order');

      // Project Management entities
      expect(entityNames).toContain('Project');
      expect(entityNames).toContain('Task');
      expect(entityNames).toContain('TimeEntry');
    });

    it('should have all workflows registered', async () => {
      const { CRMModule } = await import('../../examples/crm-module.example.js');
      const { ECommerceModule } = await import('../../examples/ecommerce-module.example.js');
      const { ProjectManagementModule } = await import('../../examples/project-management-module.example.js');

      await moduleLoader.loadModule(CRMModule);
      await moduleLoader.loadModule(ECommerceModule);
      await moduleLoader.loadModule(ProjectManagementModule);

      const workflows = metadataRegistry.listWorkflows();
      const workflowNames = workflows.map((w) => w.name);

      // CRM workflows
      expect(workflowNames).toContain('lead-assignment');
      expect(workflowNames).toContain('lead-scoring');

      // E-Commerce workflows
      expect(workflowNames).toContain('order-confirmation');
      expect(workflowNames).toContain('inventory-management');

      // Project Management workflows
      expect(workflowNames).toContain('task-status-update');
    });

    it('should have all policies registered', async () => {
      const { CRMModule } = await import('../../examples/crm-module.example.js');
      const { ECommerceModule } = await import('../../examples/ecommerce-module.example.js');
      const { ProjectManagementModule } = await import('../../examples/project-management-module.example.js');

      await moduleLoader.loadModule(CRMModule);
      await moduleLoader.loadModule(ECommerceModule);
      await moduleLoader.loadModule(ProjectManagementModule);

      const policies = metadataRegistry.listPolicies();
      const policyNames = policies.map((p) => p.name);

      // CRM policies
      expect(policyNames).toContain('lead-viewer-policy');
      expect(policyNames).toContain('lead-owner-write-policy');

      // E-Commerce policies
      expect(policyNames).toContain('customer-product-view');
      expect(policyNames).toContain('customer-order-view');

      // Project Management policies
      expect(policyNames).toContain('project-member-view');
      expect(policyNames).toContain('task-owner-edit');
    });
  });

  describe('Module Feature Verification', () => {
    it('should have AI metadata on CRM entities', async () => {
      const { CRMModule } = await import('../../examples/crm-module.example.js');

      await moduleLoader.loadModule(CRMModule);

      const leadEntity = metadataRegistry.getEntity('Lead');
      expect(leadEntity.aiMetadata).toBeDefined();
      expect(leadEntity.aiMetadata.description).toContain('Prospective customers');
      expect(leadEntity.aiMetadata.sensitiveFields).toContain('email');
      expect(leadEntity.aiMetadata.sensitiveFields).toContain('phone');
    });

    it('should have indexed fields for query optimization', async () => {
      const { CRMModule } = await import('../../examples/crm-module.example.js');

      await moduleLoader.loadModule(CRMModule);

      const leadEntity = metadataRegistry.getEntity('Lead');
      expect(leadEntity.fields.owner.isIndexed).toBe(true);
      expect(leadEntity.fields.status).toBeDefined();
    });

    it('should have permissions defined for modules', async () => {
      const { CRMModule } = await import('../../examples/crm-module.example.js');

      await moduleLoader.loadModule(CRMModule);

      const crmModule = metadataRegistry.getModule('crm');
      expect(crmModule.permissions).toContain('crm.leads.read');
      expect(crmModule.permissions).toContain('crm.leads.write');
      expect(crmModule.permissions).toContain('crm.leads.delete');
    });
  });
});
