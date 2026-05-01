import { LLMNode } from '../nodes/llm.node.js';
import { ConditionNode } from '../nodes/condition.node.js';
import { WebhookNode } from '../nodes/webhook.node.js';
import { DelayNode } from '../nodes/delay.node.js';
import { ScriptNode } from '../nodes/script.node.js';
import { LoopNode } from '../nodes/loop.node.js';
import { AgentNode } from '../nodes/agent.node.js';

export class NodeRegistryService {
  constructor() {
    this.nodes = new Map();
  }

  register(type, NodeClass) {
    const instance = new NodeClass();
    this.nodes.set(type, instance);
  }

  registerAll() {
    this.register('llm', LLMNode);
    this.register('condition', ConditionNode);
    this.register('webhook', WebhookNode);
    this.register('delay', DelayNode);
    this.register('script', ScriptNode);
    this.register('loop', LoopNode);
    this.register('agent', AgentNode);
  }

  getNode(type) {
    return this.nodes.get(type) || null;
  }

  listNodeTypes() {
    return Array.from(this.nodes.keys());
  }

  getNodeMetadata(type) {
    const node = this.getNode(type);
    return node ? node.getMetadata() : null;
  }

  getAllMetadata() {
    return Array.from(this.nodes.entries()).map(([type, node]) => ({
      type,
      ...node.getMetadata()
    }));
  }
}
