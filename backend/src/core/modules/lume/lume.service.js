const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { registry } = require('../../hooks');
const { CRUDMixin } = require('../../services/crud.mixin');

class LumeService extends CRUDMixin {
    constructor(db, context = {}) {
        super(null, db, context);
        this._db = db;
        this._context = context;
    }

    async getSystemInfo() {
        return {
            name: 'Lume',
            version: '1.0.0',
            tagline: 'Modular Light Framework',
            modules: this._getLoadedModules(),
            features: this._getEnabledFeatures(),
            settings: await this._getSettings()
        };
    }

    async getModuleStatus() {
        const modules = this._getLoadedModules();
        return modules.map(m => ({
            name: m.name,
            version: m.version,
            state: m.state,
            installed_at: m.installed_at
        }));
    }

    async createSequence(data) {
        const { Sequence } = this._db.models;
        
        const sequence = await Sequence.create({
            id: uuidv4(),
            name: data.name,
            prefix: data.prefix || '',
            suffix: data.suffix || '',
            padding: data.padding || 4,
            sequence_next: data.start || 1,
            step: data.step || 1,
            active: true,
            company_id: this._context.company_id || null
        });

        return sequence;
    }

    async getNextSequenceNumber(sequenceName) {
        const { Sequence } = this._db.models;
        
        let sequence = await Sequence.findOne({
            where: { name: sequenceName }
        });

        if (!sequence) {
            sequence = await this.createSequence({ name: sequenceName });
        }

        const nextNumber = sequence.sequence_next;
        await Sequence.update(
            { sequence_next: sequence.sequence_next + sequence.step },
            { where: { id: sequence.id } }
        );

        return {
            sequence: sequenceName,
            number: nextNumber,
            code: this._formatCode(sequence, nextNumber)
        };
    }

    _formatCode(sequence, number) {
        const prefix = sequence.prefix || '';
        const suffix = sequence.suffix || '';
        const padding = sequence.padding || 4;
        
        return `${prefix}${String(number).padStart(padding, '0')}${suffix}`;
    }

    async createRecordRule(data) {
        const { RecordRule } = this._db.models;
        
        const rule = await RecordRule.create({
            id: uuidv4(),
            name: data.name,
            model_name: data.model,
            domain: data.domain || [],
            scope: data.scope || 'user',
            user_id: data.user_id || this._context.user_id,
            role_id: data.role_id || null,
            apply_read: data.apply_read !== false,
            apply_write: data.apply_write !== false,
            active: true,
            company_id: this._context.company_id || null
        });

        return rule;
    }

    async getRecordRules(modelName) {
        const { RecordRule } = this._db.models;
        
        return await RecordRule.findAll({
            where: {
                model_name: modelName,
                active: true
            }
        });
    }

    async checkRecordAccess(userId, modelName, recordId, operation = 'read') {
        const rules = await this.getRecordRules(modelName);
        
        if (!rules.length) return true;

        for (const rule of rules) {
            if (rule.scope === 'all') return true;
            if (rule.scope === 'user' && rule.user_id === userId) {
                return operation === 'read' ? rule.apply_read : rule.apply_write;
            }
        }

        return false;
    }

    async registerHook(hookName, callback, priority = 10) {
        registry.register(hookName, callback, priority);
        return { hook: hookName, registered: true };
    }

    async executeHook(hookName, context = {}) {
        return await registry.execute(hookName, context);
    }

    async getRegisteredHooks() {
        return registry.getRegisteredHooks();
    }

    async updateSettings(key, value) {
        const { Setting } = this._db.models;
        
        const [setting] = await Setting.findOrCreate({
            where: { key: `lume.${key}` },
            defaults: {
                key: `lume.${key}`,
                value: JSON.stringify(value),
                type: typeof value
            }
        });

        if (setting.value !== JSON.stringify(value)) {
            setting.value = JSON.stringify(value);
            await setting.save();
        }

        return setting;
    }

    async getSettings() {
        const { Setting } = this._db.models;
        
        const settings = await Setting.findAll({
            where: {
                key: { [Symbol.for('like')]: 'lume.%' }
            }
        });

        const result = {};
        for (const s of settings) {
            const key = s.key.replace('lume.', '');
            try {
                result[key] = JSON.parse(s.value);
            } catch {
                result[key] = s.value;
            }
        }

        return result;
    }

    async getStatistics() {
        const { User, Donation, Activity, Document } = this._db.models;
        
        const [
            totalUsers,
            totalDonations,
            totalActivities,
            totalDocuments
        ] = await Promise.all([
            User?.count?.() || 0,
            Donation?.count?.() || 0,
            Activity?.count?.() || 0,
            Document?.count?.() || 0
        ]);

        const totalRaised = await Donation?.sum?.('amount') || 0;

        return {
            users: totalUsers,
            donations: totalDonations,
            activities: totalActivities,
            documents: totalDocuments,
            total_raised: totalRaised
        };
    }

    async exportData(format = 'json') {
        const data = {
            exported_at: new Date().toISOString(),
            framework: 'Lume',
            version: '1.0.0',
            statistics: await this.getStatistics(),
            settings: await this.getSettings(),
            modules: await this.getModuleStatus()
        };

        if (format === 'json') {
            return data;
        }

        return JSON.stringify(data, null, 2);
    }

    _getLoadedModules() {
        return global.__MODULES__ || [];
    }

    _getEnabledFeatures() {
        return {
            hooks: true,
            sequences: true,
            record_rules: true,
            multi_tenant: true,
            audit_logging: true,
            rate_limiting: true,
            jwt_auth: true,
            soft_delete: true,
            crud_mixin: true,
            dynamic_modules: true
        };
    }
}

const createLumeRouter = (db) => {
    const router = express.Router();

    router.get('/info', async (req, res) => {
        try {
            const service = new LumeService(db, req.user ? { user_id: req.user.id } : {});
            const info = await service.getSystemInfo();
            res.json({ success: true, data: info });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    });

    router.get('/modules/status', async (req, res) => {
        try {
            const service = new LumeService(db, { user_id: req.user?.id });
            const status = await service.getModuleStatus();
            res.json({ success: true, data: status });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    });

    router.get('/statistics', async (req, res) => {
        try {
            const service = new LumeService(db, { user_id: req.user?.id });
            const stats = await service.getStatistics();
            res.json({ success: true, data: stats });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    });

    router.get('/settings', async (req, res) => {
        try {
            const service = new LumeService(db, { user_id: req.user?.id });
            const settings = await service.getSettings();
            res.json({ success: true, data: settings });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    });

    router.put('/settings', async (req, res) => {
        try {
            const service = new LumeService(db, { user_id: req.user?.id });
            const { key, value } = req.body;
            
            if (!key) {
                return res.status(400).json({ success: false, error: 'Key is required' });
            }

            await service.updateSettings(key, value);
            const settings = await service.getSettings();
            res.json({ success: true, data: settings });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    });

    router.post('/sequences/generate', async (req, res) => {
        try {
            const service = new LumeService(db, { user_id: req.user?.id });
            const { name } = req.body;
            
            if (!name) {
                return res.status(400).json({ success: false, error: 'Sequence name is required' });
            }

            const result = await service.getNextSequenceNumber(name);
            res.json({ success: true, data: result });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    });

    router.get('/record-rules/:model', async (req, res) => {
        try {
            const service = new LumeService(db, { user_id: req.user?.id });
            const rules = await service.getRecordRules(req.params.model);
            res.json({ success: true, data: rules });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    });

    router.post('/record-rules', async (req, res) => {
        try {
            const service = new LumeService(db, { user_id: req.user?.id, company_id: req.user?.company_id });
            const rule = await service.createRecordRule(req.body);
            res.json({ success: true, data: rule });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    });

    router.get('/hooks', async (req, res) => {
        try {
            const service = new LumeService(db);
            const hooks = await service.getRegisteredHooks();
            res.json({ success: true, data: hooks });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    });

    router.post('/hooks/execute', async (req, res) => {
        try {
            const service = new LumeService(db);
            const { hook_name, context } = req.body;
            
            if (!hook_name) {
                return res.status(400).json({ success: false, error: 'Hook name is required' });
            }

            const result = await service.executeHook(hook_name, context || {});
            res.json({ success: true, data: result });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    });

    router.get('/export', async (req, res) => {
        try {
            const service = new LumeService(db, { user_id: req.user?.id });
            const format = req.query.format || 'json';
            const data = await service.exportData(format);
            
            res.setHeader('Content-Disposition', `attachment; filename=lume-export.${format}`);
            res.json(data);
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    });

    return router;
};

module.exports = { LumeService, createLumeRouter };
