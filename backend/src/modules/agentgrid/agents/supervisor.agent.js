import { AbstractAgent } from './base.agent.js';

export class SupervisorAgent extends AbstractAgent {
  constructor(config = {}) {
    super('supervisor', config);
  }

  topoSort(nodes, edges) {
    const nodeMap = new Map(nodes.map(n => [n.id, n]));
    const inDegree = new Map();
    const adjacencyList = new Map();

    nodes.forEach(node => {
      inDegree.set(node.id, 0);
      adjacencyList.set(node.id, []);
    });

    edges.forEach(edge => {
      if (nodeMap.has(edge.source) && nodeMap.has(edge.target)) {
        inDegree.set(edge.target, (inDegree.get(edge.target) || 0) + 1);
        adjacencyList.get(edge.source).push(edge.target);
      }
    });

    const groups = [];
    let queue = [];

    nodes.forEach(node => {
      if (inDegree.get(node.id) === 0) {
        queue.push(node.id);
      }
    });

    while (queue.length > 0) {
      groups.push([...queue]);
      const nextQueue = [];

      queue.forEach(nodeId => {
        adjacencyList.get(nodeId).forEach(neighbor => {
          inDegree.set(neighbor, inDegree.get(neighbor) - 1);
          if (inDegree.get(neighbor) === 0) {
            nextQueue.push(neighbor);
          }
        });
      });

      queue = nextQueue;
    }

    return groups;
  }

  async execute(task, context) {
    const { model = 'gpt-4o-mini', systemPrompt = '' } = this.config;

    context?.logger?.('info', `Supervisor starting task decomposition`, { task: task.substring(0, 100) });

    const planningPrompt = `You are a task planning supervisor. Given a complex task, break it down into independent subtasks.

Task: ${task}

Respond with ONLY a valid JSON array (no markdown, no explanation) with this structure:
[
  {"id": "task-1", "description": "...", "capability": "data_analysis", "dependencies": []},
  {"id": "task-2", "description": "...", "capability": "web_search", "dependencies": ["task-1"]}
]

Capabilities: data_analysis, web_search, code_generation, content_writing, image_generation`;

    let plan = [];

    try {
      const planResponse = await this.callLLM(model, [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: planningPrompt }
      ], [], context);

      const planText = planResponse.content;
      plan = JSON.parse(planText);
      context?.logger?.('info', `Task plan created`, { taskCount: plan.length });
    } catch (error) {
      context?.logger?.('error', `Planning failed, using simple decomposition`, { error: error.message });
      plan = [{ id: 'task-1', description: task, capability: 'general', dependencies: [] }];
    }

    const groups = this.topoSort(plan, plan.flatMap((task, idx) =>
      (task.dependencies || []).map(dep => ({ source: dep, target: task.id }))
    ));

    const results = {};

    for (const group of groups) {
      await Promise.all(group.map(async (taskId) => {
        const subtask = plan.find(t => t.id === taskId);
        if (!subtask) return;

        context?.logger?.('info', `Delegating subtask`, { subtaskId: taskId, capability: subtask.capability });

        const capableAgent = await context?.toolRegistry?.findAgentByCapability(subtask.capability);
        if (!capableAgent) {
          context?.logger?.('warn', `No agent found for capability`, { capability: subtask.capability });
          results[taskId] = { status: 'failed', error: `No agent found for capability: ${subtask.capability}` };
          return;
        }

        const workerResult = await context?.executeSubAgent(capableAgent.id, subtask.description);
        results[taskId] = workerResult;
      }));
    }

    const synthesis = await this.synthesizeResults(model, task, plan, results, context);

    return {
      plan,
      results,
      synthesis,
      taskCount: plan.length,
      completedTasks: Object.keys(results).length
    };
  }

  async synthesizeResults(model, originalTask, plan, results, context) {
    const resultsText = Object.entries(results)
      .map(([taskId, result]) => `${taskId}: ${result.output || result.error || 'No output'}`)
      .join('\n');

    const synthesisPrompt = `You are synthesizing results from multiple subtasks to answer the original request.

Original task: ${originalTask}

Subtask results:
${resultsText}

Provide a concise, integrated answer based on these results.`;

    const synthesisResponse = await this.callLLM(model, [
      { role: 'user', content: synthesisPrompt }
    ], [], context);

    return synthesisResponse.content;
  }

  async callLLM(model, messages, tools, context) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error('OPENAI_API_KEY not set');

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: 0.7,
        tools: tools.length > 0 ? tools : undefined
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`OpenAI API error: ${error.error?.message || response.statusText}`);
    }

    const data = await response.json();
    return {
      content: data.choices[0]?.message?.content || '',
      stop_reason: data.choices[0]?.finish_reason
    };
  }

  getMetadata() {
    return {
      ...super.getMetadata(),
      type: 'supervisor',
      description: 'Task decomposition and delegation supervisor agent'
    };
  }
}
