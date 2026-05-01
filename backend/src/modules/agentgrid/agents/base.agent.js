export class AbstractAgent {
  constructor(type, config = {}) {
    this.type = type;
    this.config = config;
  }

  async validate(agentConfig) {
    const errors = [];
    if (!agentConfig.model) errors.push('model is required');
    if (!agentConfig.systemPrompt) errors.push('systemPrompt is required');
    return errors;
  }

  async execute(task, context) {
    throw new Error(`${this.type} agent execute() not implemented`);
  }

  getMetadata() {
    return {
      type: this.type,
      description: `${this.type} agent`,
      requiresModel: true
    };
  }

  resolveTemplate(template, context) {
    if (typeof template !== 'string') return template;
    return template.replace(/\{\{([^}]+)\}\}/g, (match, path) => {
      const parts = path.split('.');
      let value = context?.variables || {};
      for (const part of parts) {
        if (value && typeof value === 'object' && part in value) {
          value = value[part];
        } else {
          return match;
        }
      }
      return typeof value === 'string' ? value : JSON.stringify(value);
    });
  }
}
