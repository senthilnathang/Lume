import { AbstractTool } from './base.tool.js';

export class SearchTool extends AbstractTool {
  constructor() {
    super('search_database', {});
  }

  async execute(args, context) {
    const { tables = [], query, limit = 10 } = args;

    if (!query) {
      return { success: false, error: 'Query parameter is required' };
    }

    const SEARCHABLE_TABLES = ['activities', 'messages', 'documents', 'team'];
    const tablesToSearch = tables.length > 0 ? tables.filter(t => SEARCHABLE_TABLES.includes(t)) : SEARCHABLE_TABLES;

    const results = [];

    try {
      for (const table of tablesToSearch) {
        const { getModule } = await import('../../../core/modules/__loader__.js');
        const module = getModule(table.replace(/s$/, ''));

        if (module && module.services) {
          const domain = [['name', 'like', `%${query}%`]];
          const result = await module.services.search({
            domain,
            limit,
            page: 1
          });

          results.push({
            table,
            count: result.items?.length || 0,
            items: result.items || []
          });
        }
      }

      context?.logger?.('info', `Search executed: ${query}`, { query, tablesSearched: tablesToSearch.length, resultsFound: results.length });

      return {
        success: true,
        query,
        results,
        totalResults: results.reduce((sum, r) => sum + r.count, 0)
      };
    } catch (error) {
      context?.logger?.('error', `Search failed: ${error.message}`, { query, error: error.message });
      return { success: false, error: error.message };
    }
  }

  getSchema() {
    return {
      type: 'function',
      function: {
        name: 'search_database',
        description: 'Search across database tables using full-text search',
        parameters: {
          type: 'object',
          properties: {
            query: { type: 'string', description: 'Search query string' },
            tables: { type: 'array', items: { type: 'string' }, description: 'Tables to search (activities, messages, documents, team)' },
            limit: { type: 'number', description: 'Max results per table (default 10)' }
          },
          required: ['query']
        }
      }
    };
  }
}
