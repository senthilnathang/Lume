import { AbstractTool } from './base.tool.js';

export class DatabaseTool extends AbstractTool {
  constructor() {
    super('query_database', {});
  }

  async execute(args, context) {
    const { model, domain = [], limit = 20 } = args;

    const ALLOWED_MODELS = ['activities', 'messages', 'team', 'documents'];

    if (!ALLOWED_MODELS.includes(model)) {
      return { success: false, error: `Model ${model} not allowed` };
    }

    try {
      const { getModule } = await import('../../../core/modules/__loader__.js');

      const module = getModule(model.replace(/s$/, ''));
      if (!module || !module.services) {
        return { success: false, error: `Module not found for ${model}` };
      }

      const service = module.services;
      const result = await service.search({
        domain,
        limit,
        page: 1
      });

      context?.logger?.('info', `Database query: ${model}`, { model, resultCount: result.items?.length || 0 });

      return {
        success: true,
        model,
        count: result.items?.length || 0,
        total: result.total || 0,
        data: result.items || []
      };
    } catch (error) {
      context?.logger?.('error', `Database query failed: ${error.message}`, { model, error: error.message });
      return { success: false, error: error.message };
    }
  }

  getSchema() {
    return {
      type: 'function',
      function: {
        name: 'query_database',
        description: 'Query data from allowed database models',
        parameters: {
          type: 'object',
          properties: {
            model: { type: 'string', enum: ['activities', 'messages', 'team', 'documents'], description: 'Model to query' },
            domain: { type: 'array', description: 'Domain filter tuples: [[field, op, value], ...]' },
            limit: { type: 'number', description: 'Max results to return (default 20)' }
          },
          required: ['model']
        }
      }
    };
  }
}
