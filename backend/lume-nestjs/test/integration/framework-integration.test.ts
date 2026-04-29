import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { AppModule } from '../../src/app.module';
import { EntityRegistryService } from '../../src/core/entity/entity-registry.service';
import { MetadataRegistryService } from '../../src/core/runtime/metadata-registry.service';
import { WorkflowExecutorService } from '../../src/core/workflow/workflow-executor.service';
import { PolicyEvaluatorService } from '../../src/core/permission/policy-evaluator.service';
import { VersioningService } from '../../src/core/versioning/versioning.service';
import { AskQueryService } from '../../src/core/ai/ask-query.service';
import { ModuleLoaderService } from '../../src/core/module/module-loader.service';
import { defineEntity } from '../../src/core/entity/define-entity';
import { defineModule } from '../../src/core/module/define-module';
import { defineWorkflow } from '../../src/core/workflow/define-workflow';
import { definePolicy } from '../../src/core/permission/define-policy';

describe('Framework Integration Tests (All 8 Phases)', () => {
  let app: INestApplication;
  let entityRegistry: EntityRegistryService;
  let metadataRegistry: MetadataRegistryService;
  let workflowExecutor: WorkflowExecutorService;
  let policyEvaluator: PolicyEvaluatorService;
  let versioningService: VersioningService;
  let askQueryService: AskQueryService;
  let moduleLoader: ModuleLoaderService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    entityRegistry = moduleFixture.get<EntityRegistryService>(EntityRegistryService);
    metadataRegistry = moduleFixture.get<MetadataRegistryService>(MetadataRegistryService);
    workflowExecutor = moduleFixture.get<WorkflowExecutorService>(WorkflowExecutorService);
    policyEvaluator = moduleFixture.get<PolicyEvaluatorService>(PolicyEvaluatorService);
    versioningService = moduleFixture.get<VersioningService>(VersioningService);
    askQueryService = moduleFixture.get<AskQueryService>(AskQueryService);
    moduleLoader = moduleFixture.get<ModuleLoaderService>(ModuleLoaderService);
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Phase 0-1: Runtime Kernel + Entity Engine', () => {
    it('should register and resolve entities with hooks', () => {
      const TestEntity = defineEntity('TestEntity', {
        label: 'Test Entity',
        fields: {
          id: { name: 'id', type: 'int', required: true },
          name: { name: 'name', type: 'string', required: true },
          status: { name: 'status', type: 'string', defaultValue: 'new' },
        },
        hooks: {
          beforeCreate: async (data) => {
            data.status = 'pending';
            return data;
          },
        },
      });

      entityRegistry.register(TestEntity);
      const resolved = entityRegistry.getWithExtensions('TestEntity');

      expect(resolved).toBeDefined();
      expect(resolved?.name).toBe('TestEntity');
      expect(resolved?.hooks?.beforeCreate).toBeDefined();
    });
  });

  describe('Phase 2: Module Engine', () => {
    it('should load modules with dependencies', async () => {
      const TestModule = defineModule({
        name: 'test-module',
        version: '1.0.0',
        depends: [],
        entities: [
          defineEntity('ModuleEntity', {
            label: 'Module Entity',
            fields: {
              id: { name: 'id', type: 'int', required: true },
              name: { name: 'name', type: 'string', required: true },
            },
          }),
        ],
      });

      await moduleLoader.loadModule(TestModule);

      expect(moduleLoader.isLoaded('test-module')).toBe(true);
      const entity = metadataRegistry.getEntity('ModuleEntity');
      expect(entity).toBeDefined();
    });
  });

  describe('Phase 3: Permission Engine', () => {
    it('should evaluate ABAC policies with context variables', () => {
      const policy = definePolicy({
        name: 'owner-only',
        entity: 'TestEntity',
        actions: ['read', 'write'],
        conditions: [
          {
            field: 'owner',
            operator: '==',
            value: '$userId',
          },
        ],
      });

      metadataRegistry.registerPolicy(policy);

      const context = {
        userId: 123,
        userRoles: ['user'],
      };

      const record = { id: 1, owner: 123, name: 'Test' };
      const canRead = policyEvaluator.evaluate(policy, context, record);

      expect(canRead).toBe(true);
    });

    it('should deny access when conditions not met', () => {
      const policy = definePolicy({
        name: 'owner-only-deny',
        entity: 'TestEntity',
        actions: ['read'],
        conditions: [
          {
            field: 'owner',
            operator: '==',
            value: '$userId',
          },
        ],
      });

      const context = { userId: 123 };
      const record = { id: 1, owner: 456, name: 'Test' };

      const canRead = policyEvaluator.evaluate(policy, context, record);
      expect(canRead).toBe(false);
    });
  });

  describe('Phase 4: Workflow Engine', () => {
    it('should execute workflow with condition and set_field steps', async () => {
      const workflow = defineWorkflow({
        name: 'test-workflow',
        entity: 'TestEntity',
        trigger: { type: 'record.created' },
        steps: [
          {
            type: 'condition',
            if: { field: 'status', operator: '==', value: 'new' },
            then: [
              {
                type: 'set_field',
                field: 'status',
                value: 'processing',
              },
            ],
          },
        ],
      });

      metadataRegistry.registerWorkflow(workflow);

      const record = { id: 1, status: 'new', name: 'Test' };
      const run = await workflowExecutor.execute(
        'test-workflow',
        record,
        'TestEntity',
        { type: 'record.created' },
        123,
      );

      expect(run.status).toBe('completed');
      expect(run.stepsLog.length).toBeGreaterThan(0);
    });
  });

  describe('Phase 6: Versioning System', () => {
    it('should create record versions with diffs', async () => {
      const v1 = await versioningService.saveRecordVersion(
        'TestEntity',
        1,
        { id: 1, name: 'Original', status: 'new' },
        'create',
        123,
        'user',
      );

      expect(v1.versionNumber).toBe(1);
      expect(v1.changedFields).toBeDefined();

      const v2 = await versioningService.saveRecordVersion(
        'TestEntity',
        1,
        { id: 1, name: 'Updated', status: 'processing' },
        'update',
        123,
        'user',
      );

      expect(v2.versionNumber).toBe(2);
      expect(v2.diff?.name).toBeDefined();
      expect(v2.diff?.name.from).toBe('Original');
      expect(v2.diff?.name.to).toBe('Updated');
    });

    it('should retrieve record history', async () => {
      await versioningService.saveRecordVersion(
        'HistoryEntity',
        1,
        { id: 1, value: 'v1' },
        'create',
        1,
      );

      await versioningService.saveRecordVersion(
        'HistoryEntity',
        1,
        { id: 1, value: 'v2' },
        'update',
        1,
      );

      const history = await versioningService.getRecordHistory(
        'HistoryEntity',
        1,
      );

      expect(history.length).toBeGreaterThanOrEqual(2);
    });

    it('should restore record to prior version', async () => {
      const v1 = await versioningService.saveRecordVersion(
        'RestoreEntity',
        1,
        { id: 1, data: 'original' },
        'create',
        1,
      );

      await versioningService.saveRecordVersion(
        'RestoreEntity',
        1,
        { id: 1, data: 'modified' },
        'update',
        1,
      );

      const restored = await versioningService.restoreRecordVersion(
        'RestoreEntity',
        1,
        v1.id!,
        1,
      );

      expect(restored.dataSnapshot.data).toBe('original');
    });
  });

  describe('Phase 7: AI Layer', () => {
    it('should ask natural language queries', async () => {
      const context = {
        userId: 1,
        userRoles: ['user'],
      };

      const result = await askQueryService.ask(
        'Lead',
        'Show me active leads',
        context,
      );

      expect(result.answer).toBeDefined();
      expect(result.confidence).toBeGreaterThan(0);
      expect(result.executionTime).toBeGreaterThan(0);
    });
  });

  describe('Full Workflow Integration', () => {
    it('should execute complete flow: entity → policy → workflow → version → query', async () => {
      // 1. Register entity with hooks
      const SalesEntity = defineEntity('Sale', {
        label: 'Sale',
        fields: {
          id: { name: 'id', type: 'int', required: true },
          amount: { name: 'amount', type: 'number', required: true },
          owner: { name: 'owner', type: 'int', required: true },
          status: { name: 'status', type: 'string', defaultValue: 'draft' },
        },
        hooks: {
          beforeCreate: async (data) => {
            data.status = 'pending_review';
            return data;
          },
          afterCreate: async (record) => {
            console.log(`Sale created: ${record.id}`);
          },
        },
      });

      entityRegistry.register(SalesEntity);

      // 2. Define policy
      const ownerPolicy = definePolicy({
        name: 'sale-owner-access',
        entity: 'Sale',
        actions: ['read', 'write'],
        conditions: [
          {
            field: 'owner',
            operator: '==',
            value: '$userId',
          },
        ],
      });

      metadataRegistry.registerPolicy(ownerPolicy);

      // 3. Define workflow
      const saleWorkflow = defineWorkflow({
        name: 'sale-auto-approve',
        entity: 'Sale',
        trigger: { type: 'record.created' },
        steps: [
          {
            type: 'condition',
            if: { field: 'amount', operator: '<', value: 1000 },
            then: [
              {
                type: 'set_field',
                field: 'status',
                value: 'approved',
              },
            ],
          },
        ],
      });

      metadataRegistry.registerWorkflow(saleWorkflow);

      // 4. Test the flow
      const newSale = {
        id: 1,
        amount: 500,
        owner: 123,
        status: 'draft',
      };

      // Check policy
      const userContext = { userId: 123, userRoles: ['user'] };
      const hasAccess = policyEvaluator.evaluate(ownerPolicy, userContext, newSale);
      expect(hasAccess).toBe(true);

      // Run workflow
      const workflowRun = await workflowExecutor.execute(
        'sale-auto-approve',
        newSale,
        'Sale',
        { type: 'record.created' },
        123,
      );

      expect(workflowRun.status).toBe('completed');

      // Track version
      const version = await versioningService.saveRecordVersion(
        'Sale',
        1,
        newSale,
        'create',
        123,
        'workflow',
      );

      expect(version.versionNumber).toBe(1);
      expect(version.changeSource).toBe('workflow');

      // Query with AI
      const query = await askQueryService.ask(
        'Sale',
        'What is the total amount of approved sales?',
        userContext,
      );

      expect(query.answer).toBeDefined();
      expect(query.executionTime).toBeGreaterThan(0);
    });
  });

  describe('Error Handling', () => {
    it('should handle unregistered entity gracefully', async () => {
      const context = { userId: 1 };
      expect(async () => {
        await askQueryService.ask('NonExistentEntity', 'test', context);
      }).rejects.toThrow();
    });

    it('should handle workflow execution errors', async () => {
      const badWorkflow = defineWorkflow({
        name: 'bad-workflow',
        entity: 'Sale',
        trigger: { type: 'record.created' },
        steps: [
          {
            type: 'custom',
            handler: 'non-existent-handler',
          },
        ],
        onError: 'stop',
      });

      metadataRegistry.registerWorkflow(badWorkflow);

      const run = await workflowExecutor.execute(
        'bad-workflow',
        { id: 1 },
        'Sale',
        { type: 'record.created' },
      );

      expect(run.status).toBe('failed');
      expect(run.errorMessage).toBeDefined();
    });
  });
});
