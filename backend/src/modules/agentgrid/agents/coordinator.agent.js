import { AbstractAgent } from './base.agent.js';

export class CoordinatorAgent extends AbstractAgent {
  constructor(config = {}) {
    super('coordinator', config);
  }

  async execute(task, context) {
    const { agents = [], mergeStrategy = 'concat', model = 'gpt-4o-mini' } = this.config;

    if (!agents || agents.length === 0) {
      return { success: false, error: 'No agents configured for coordination' };
    }

    context?.logger?.('info', `Coordinator starting parallel execution`, { agentCount: agents.length, strategy: mergeStrategy });

    const agentResults = await Promise.all(
      agents.map(async (agentConfig) => {
        try {
          const result = await context?.executeSubAgent(agentConfig.agentId, agentConfig.input || {});
          context?.logger?.('info', `Agent completed`, { agentId: agentConfig.agentId, status: result.status });
          return { agentId: agentConfig.agentId, ...result };
        } catch (error) {
          context?.logger?.('error', `Agent failed`, { agentId: agentConfig.agentId, error: error.message });
          return { agentId: agentConfig.agentId, status: 'failed', error: error.message };
        }
      })
    );

    const mergedResult = await this.mergeResults(agentResults, mergeStrategy, model, context);

    return {
      agentResults,
      mergedResult,
      strategy: mergeStrategy,
      successCount: agentResults.filter(r => r.status === 'success').length,
      totalAgents: agentResults.length
    };
  }

  async mergeResults(results, strategy, model, context) {
    const successfulResults = results.filter(r => r.status === 'success');

    switch (strategy) {
      case 'concat':
        return {
          type: 'concatenated',
          content: successfulResults.map(r => `[${r.agentId}] ${r.output || ''}`).join('\n\n')
        };

      case 'first':
        return {
          type: 'first_success',
          content: successfulResults[0]?.output || results[0]?.error || 'No results'
        };

      case 'vote': {
        const votes = {};
        successfulResults.forEach(r => {
          const output = r.output || '';
          votes[output] = (votes[output] || 0) + 1;
        });
        const winning = Object.entries(votes).sort((a, b) => b[1] - a[1])[0];
        return {
          type: 'voted',
          content: winning ? winning[0] : 'No consensus',
          votes
        };
      }

      case 'synthesize': {
        const synthesis = await this.synthesize(successfulResults, model, context);
        return {
          type: 'synthesized',
          content: synthesis
        };
      }

      default:
        return { type: 'concat', content: successfulResults.map(r => r.output).join('\n\n') };
    }
  }

  async synthesize(results, model, context) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) return 'Could not synthesize results';

    const resultsText = results.map(r => `Agent ${r.agentId}: ${r.output || ''}`).join('\n\n');

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'user', content: `Synthesize these results into a coherent summary:\n\n${resultsText}` }
        ],
        temperature: 0.7
      })
    });

    if (!response.ok) return 'Synthesis failed';

    const data = await response.json();
    return data.choices[0]?.message?.content || 'No synthesis produced';
  }

  getMetadata() {
    return {
      ...super.getMetadata(),
      type: 'coordinator',
      description: 'Parallel multi-agent coordinator with result merging'
    };
  }
}
