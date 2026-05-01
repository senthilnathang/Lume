export class AbstractWorkflowNode {
  constructor(nodeType, config = {}) {
    this.nodeType = nodeType;
    this.config = config;
  }

  async validate(nodeConfig) {
    return [];
  }

  async execute(nodeConfig, context) {
    throw new Error(`${this.nodeType} node execute() not implemented`);
  }

  async *executeStream(nodeConfig, context) {
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
