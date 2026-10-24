import { jest } from '@jest/globals';
import { createHarness, type Harness } from './harness';
import { DrizzleService } from '../../../src/core/services/drizzle.service';
import { AutomationService } from '../../../src/modules/base_automation/services/automation.service';

jest.setTimeout(120000);
describe('Automation JSON persistence contracts', () => {
  let h: Harness;
  let service: AutomationService;
  beforeAll(async () => {
    h = await createHarness();
    service = new AutomationService(h.app.get(DrizzleService));
  });
  afterAll(async () => { await h?.close(); });

  it('round-trips workflow graphs as arrays on list, detail, and update', async () => {
    const states = [{ code: 'new', name: 'New' }];
    const created = await service.createWorkflow({ name: 'JSON check', model: 'Ticket', states, transitions: [] });
    const id = created.data.id;
    expect((await service.getWorkflow(id)).data.states).toEqual(states);
    expect((await service.getWorkflows()).data.find(row => row.id === id).transitions).toEqual([]);
    const transitions = [{ from: 'new', to: 'done' }];
    expect((await service.updateWorkflow(id, { transitions })).data.transitions).toEqual(transitions);
  });

  it('round-trips flow graphs and approval steps without JSON text leaking to clients', async () => {
    const nodes = [{ id: 'start', data: { enabled: false, count: 0 } }];
    const flow = await service.createFlow({ name: 'Flow check', model: 'Ticket', nodes, edges: [] });
    expect((await service.getFlow(flow.data.id)).data.nodes).toEqual(nodes);
    const chain = await service.createApprovalChain({ name: 'Approval check', model: 'Ticket', steps: [{ approverId: 2 }] });
    expect(chain.data.steps).toEqual([{ approverId: 2 }]);
    expect((await service.getApprovalChains()).data[0].steps).toEqual([{ approverId: 2 }]);
  });
});
