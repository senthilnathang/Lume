import { BaseService } from '../../../core/services/base.service.js';
import { DrizzleAdapter } from '../../../core/db/adapters/drizzle-adapter.js';
import { agentgridGrids } from '../models/index.js';

export class GridService extends BaseService {
  constructor() {
    const adapter = new DrizzleAdapter(agentgridGrids, {
      fieldMeta: {
        id: { type: 'int', primaryKey: true },
        tenantId: { type: 'int' },
        title: { type: 'varchar' },
        description: { type: 'text' }
      }
    });
    super(adapter, { softDelete: true, audit: true, modelName: 'agentgrid' });
  }

  async getByTenant(tenantId, options = {}) {
    const { page = 1, limit = 20 } = options;
    const search = await this.search({
      domain: [['tenantId', '=', tenantId]],
      page,
      limit
    });
    return search;
  }
}
