export class AbstractTool {
  constructor(name, config = {}) {
    this.name = name;
    this.config = config;
  }

  async execute(args, context) {
    throw new Error(`${this.name} tool execute() not implemented`);
  }

  getSchema() {
    return {
      type: 'function',
      function: {
        name: this.name,
        description: `${this.name} tool`,
        parameters: {
          type: 'object',
          properties: {},
          required: []
        }
      }
    };
  }
}
