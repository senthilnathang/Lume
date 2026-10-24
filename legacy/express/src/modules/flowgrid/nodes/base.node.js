export class AbstractWorkflowNode {
  constructor(nodeType, config = {}) {
    this.nodeType = nodeType;
    this.config = config;
  }

  // Abstract methods. Subclasses (action.node.js, decision.node.js, etc.)
  // override these and consume the args. `_`-prefixed here per the lint
  // config (see CODE_QUALITY.md → Phase 3.1).
  async validate(_nodeConfig) {
    return [];
  }

  async execute(_nodeConfig, _context) {
    throw new Error(`${this.nodeType} node execute() not implemented`);
  }

  async *executeStream(_nodeConfig, _context) {
    yield* [];
  }

  getMetadata() {
    return {
      nodeType: this.nodeType,
      supportsStreaming: false,
      category: 'utility',
      description: `${this.nodeType} node`,
      inputs: {},
      outputs: {}
    };
  }
}
