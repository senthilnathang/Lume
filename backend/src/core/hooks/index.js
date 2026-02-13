const EventEmitter = require('events');

class HookRegistry extends EventEmitter {
    constructor() {
        super();
        this._registry = new Map();
        this._model_hooks = new Map();
    }

    register(name, fn, priority = 10) {
        if (!this._registry.has(name)) {
            this._registry.set(name, []);
        }
        this._registry.get(name).push({ fn, priority });
        this._registry.get(name).sort((a, b) => a.priority - b.priority);
    }

    register_model_hook(model_name, event, fn, priority = 10) {
        const key = `${model_name}:${event}`;
        if (!this._model_hooks.has(key)) {
            this._model_hooks.set(key, []);
        }
        this._model_hooks.get(key).push({ fn, priority });
        this._model_hooks.get(key).sort((a, b) => a.priority - b.priority);
    }

    execute(name, context = {}) {
        const hooks = this._registry.get(name) || [];
        for (const { fn } of hooks) {
            const result = fn(context);
            if (result && typeof result.then === 'function') {
                return result.then(r => context);
            }
        }
        return context;
    }

    execute_model_hook(model_name, event, record, context = {}) {
        const key = `${model_name}:${event}`;
        const hooks = this._model_hooks.get(key) || [];
        for (const { fn } of hooks) {
            fn(record, context);
        }
    }
}

const registry = new HookRegistry();

function before_create(model_name, priority = 10) {
    return function(target, propertyKey, descriptor) {
        registry.register_model_hook(model_name, 'before_create', descriptor.value, priority);
        return descriptor;
    };
}

function after_create(model_name, priority = 10) {
    return function(target, propertyKey, descriptor) {
        registry.register_model_hook(model_name, 'after_create', descriptor.value, priority);
        return descriptor;
    };
}

function before_update(model_name, priority = 10) {
    return function(target, propertyKey, descriptor) {
        registry.register_model_hook(model_name, 'before_update', descriptor.value, priority);
        return descriptor;
    };
}

function after_update(model_name, priority = 10) {
    return function(target, propertyKey, descriptor) {
        registry.register_model_hook(model_name, 'after_update', descriptor.value, priority);
        return descriptor;
    };
}

function before_delete(model_name, priority = 10) {
    return function(target, propertyKey, descriptor) {
        registry.register_model_hook(model_name, 'before_delete', descriptor.value, priority);
        return descriptor;
    };
}

function after_delete(model_name, priority = 10) {
    return function(target, propertyKey, descriptor) {
        registry.register_model_hook(model_name, 'after_delete', descriptor.value, priority);
        return descriptor;
    };
}

function onchange(model_name, fields, priority = 10) {
    return function(target, propertyKey, descriptor) {
        const key = `${model_name}:onchange:${Array.isArray(fields) ? fields.join(',') : fields}`;
        registry.register(key, descriptor.value, priority);
        return descriptor;
    };
}

function constrains(model_name, field, priority = 10) {
    return function(target, propertyKey, descriptor) {
        const key = `${model_name}:constrains:${field}`;
        registry.register(key, descriptor.value, priority);
        return descriptor;
    };
}

module.exports = {
    HookRegistry,
    registry,
    before_create,
    after_create,
    before_update,
    after_update,
    before_delete,
    after_delete,
    onchange,
    constrains
};
