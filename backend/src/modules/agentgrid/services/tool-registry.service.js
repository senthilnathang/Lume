import { WebhookTool } from '../tools/webhook.tool.js';
import { FlowGridTool } from '../tools/flowgrid.tool.js';
import { DatabaseTool } from '../tools/database.tool.js';
import { AgentTool } from '../tools/agent.tool.js';
import { SearchTool } from '../tools/search.tool.js';
import { getDrizzle } from '../../../core/db/drizzle.js';
import { agentgridAgents } from '../models/index.js';
import { eq, like } from 'drizzle-orm';

export class ToolRegistryService {
  constructor() {
    this.tools = new Map();
  }

  _db() {
    return getDrizzle();
  }

  registerBuiltins() {
    this.register('webhook', new WebhookTool());
    this.register('flowgrid', new FlowGridTool());
    this.register('database', new DatabaseTool());
    this.register('agent', new AgentTool());
    this.register('search', new SearchTool());
  }

  register(name, toolInstance) {
    this.tools.set(name, toolInstance);
  }

  get(name) {
    return this.tools.get(name);
  }

  async getForAgent(agent) {
    if (!agent.tools || agent.tools.length === 0) return [];

    const tools = [];
    for (const toolName of agent.tools) {
      const tool = this.get(toolName);
      if (tool) {
        tools.push(tool);
      }
    }
    return tools;
  }

  async getSchemas(agent) {
    const tools = await this.getForAgent(agent);
    return tools.map(tool => tool.getSchema());
  }

  async execute(name, args, context) {
    const tool = this.get(name);
    if (!tool) {
      throw new Error(`Tool not found: ${name}`);
    }
    return await tool.execute(args, context);
  }

  async findAgentByCapability(capability) {
    const db = this._db();
    const result = await db.select()
      .from(agentgridAgents)
      .where(
        like(agentgridAgents.capabilities, `%${capability}%`)
      );
    return result || null;
  }
}
