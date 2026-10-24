import { BaseService } from '../../../core/services/base.service.js';
import { DrizzleAdapter } from '../../../core/db/adapters/drizzle-adapter.js';
import { agentgridAgents } from '../models/index.js';

export class AgentService extends BaseService {
  constructor() {
    const adapter = new DrizzleAdapter(agentgridAgents, {
      fieldMeta: {
        id: { type: 'int', primaryKey: true },
        gridId: { type: 'int' },
        type: { type: 'varchar' },
        status: { type: 'varchar' },
        model: { type: 'varchar' },
        maxIterations: { type: 'int' }
      }
    });
    super(adapter, { softDelete: true, audit: true, modelName: 'agent' });
  }

  async findByCapability(capability) {
    const search = await this.search({
      domain: [['capabilities', 'like', `%${capability}%`]]
    });
    return search.items || [];
  }

  async activate(id, context = {}) {
    return await this.update(id, { status: 'active' }, context);
  }

  async deactivate(id, context = {}) {
    return await this.update(id, { status: 'inactive' }, context);
  }

  async getByGrid(gridId, options = {}) {
    const { page = 1, limit = 20 } = options;
    const search = await this.search({
      domain: [['gridId', '=', gridId]],
      page,
      limit
    });
    return search;
  }

  async findByType(type, options = {}) {
    const { page = 1, limit = 20 } = options;
    const search = await this.search({
      domain: [['type', '=', type]],
      page,
      limit
    });
    return search;
  }
}
