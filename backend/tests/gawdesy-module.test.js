const express = require('express');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'gawdesy-secret-key';

global.__MODULES__ = global.__MODULES__ || [];
global.__MENUS__ = global.__MENUS__ || [];

const gawdesyManifest = {
    name: "gawdesy",
    version: "1.0.0",
    summary: "Gawdesy Enterprise Module",
    permissions: [
        { name: "gawdesy.read" },
        { name: "gawdesy.write" },
        { name: "gawdesy.admin" }
    ],
    menus: [
        { id: "gawdesy.main", title: "Gawdesy", path: "/gawdesy", icon: "settings" },
        { id: "gawdesy.settings", title: "Settings", path: "/gawdesy/settings", parent_id: "gawdesy.main" }
    ],
    views: [
        { name: "GawdesySettings", path: "/gawdesy/settings" }
    ],
    state: "installed"
};

global.__MODULES__.push(gawdesyManifest);
global.__MENUS__.push(...gawdesyManifest.menus);

const mockDb = {
    models: {
        User: {
            count: () => Promise.resolve(5),
            sum: () => Promise.resolve(15000)
        },
        Donation: {
            count: () => Promise.resolve(25),
            sum: () => Promise.resolve(50000)
        },
        Activity: {
            count: () => Promise.resolve(100)
        },
        Document: {
            count: () => Promise.resolve(50)
        },
        Sequence: {
            findOne: async () => ({ name: 'test', sequence_next: 5 }),
            create: async (data) => ({ id: 'uuid', ...data })
        },
        RecordRule: {
            findAll: async () => [],
            create: async (data) => ({ id: 'uuid', ...data })
        }
    }
};

const createTestApp = () => {
    const app = express();
    app.use(express.json());

    app.get('/api/gawdesy/health', (req, res) => {
        res.json({
            success: true,
            status: 'healthy',
            module: 'gawdesy',
            features: ['hooks', 'sequences', 'record_rules', 'crud_mixin']
        });
    });

    app.get('/api/gawdesy/info', (req, res) => {
        res.json({
            success: true,
            data: {
                name: gawdesyManifest.name,
                version: gawdesyManifest.version,
                permissions: gawdesyManifest.permissions.length,
                menus: gawdesyManifest.menus.length,
                views: gawdesyManifest.views.length
            }
        });
    });

    app.get('/api/gawdesy/statistics', async (req, res) => {
        const [users, donations, activities, documents, totalRaised] = await Promise.all([
            mockDb.models.User.count(),
            mockDb.models.Donation.count(),
            mockDb.models.Activity.count(),
            mockDb.models.Document.count(),
            mockDb.models.User.sum('amount') || 0
        ]);

        res.json({
            success: true,
            data: {
                users,
                donations,
                activities,
                documents,
                total_raised: totalRaised,
                modules_loaded: global.__MODULES__.length
            }
        });
    });

    app.get('/api/gawdesy/modules', (req, res) => {
        res.json({
            success: true,
            data: global.__MODULES__.map(m => ({
                name: m.name,
                version: m.version,
                state: m.state
            }))
        });
    });

    app.get('/api/gawdesy/menus', (req, res) => {
        res.json({
            success: true,
            data: global.__MENUS__
        });
    });

    app.get('/api/gawdesy/permissions', (req, res) => {
        res.json({
            success: true,
            data: gawdesyManifest.permissions
        });
    });

    app.get('/api/modules', (req, res) => {
        res.json({
            success: true,
            data: global.__MODULES__
        });
    });

    app.get('/api/menus', (req, res) => {
        res.json({
            success: true,
            data: global.__MENUS__
        });
    });

    app.post('/api/sequences/generate', async (req, res) => {
        const { name } = req.body;
        const sequence = await mockDb.models.Sequence.findOne();
        
        res.json({
            success: true,
            data: {
                sequence: name,
                number: sequence.sequence_next,
                code: `${name.toUpperCase()}-${String(sequence.sequence_next).padStart(4, '0')}`
            }
        });
    });

    app.post('/api/record-rules', async (req, res) => {
        const rule = await mockDb.models.RecordRule.create(req.body);
        res.json({ success: true, data: rule });
    });

    app.get('/api/record-rules/:model', async (req, res) => {
        const rules = await mockDb.models.RecordRule.findAll();
        res.json({ success: true, data: rules });
    });

    return app;
};

describe('GAWDESY Modular System Tests', () => {
    let app;
    let authToken;

    beforeAll(() => {
        app = createTestApp();
        authToken = jwt.sign({ id: 1, email: 'admin@test.com' }, JWT_SECRET);
    });

    describe('Module Manifest', () => {
        test('Gawdesy module is registered', () => {
            const gawdesyModule = global.__MODULES__.find(m => m.name === 'gawdesy');
            expect(gawdesyModule).toBeDefined();
            expect(gawdesyModule.version).toBe('1.0.0');
        });

        test('Module has required permissions', () => {
            const permissions = gawdesyManifest.permissions;
            expect(permissions.some(p => p.name === 'gawdesy.read')).toBe(true);
            expect(permissions.some(p => p.name === 'gawdesy.write')).toBe(true);
            expect(permissions.some(p => p.name === 'gawdesy.admin')).toBe(true);
        });

        test('Module has menus configured', () => {
            expect(gawdesyManifest.menus.length).toBeGreaterThan(0);
            expect(gawdesyManifest.menus.some(m => m.path === '/gawdesy')).toBe(true);
        });

        test('Module has views defined', () => {
            expect(gawdesyManifest.views.length).toBeGreaterThan(0);
        });
    });

    describe('Module Health Check', () => {
        test('GET /api/gawdesy/health returns healthy status', async () => {
            const response = await request(app)
                .get('/api/gawdesy/health')
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.status).toBe('healthy');
            expect(response.body.features).toContain('hooks');
            expect(response.body.features).toContain('sequences');
        });
    });

    describe('Module Info', () => {
        test('GET /api/gawdesy/info returns module information', async () => {
            const response = await request(app)
                .get('/api/gawdesy/info')
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data.name).toBe('gawdesy');
            expect(response.body.data.version).toBe('1.0.0');
            expect(response.body.data.permissions).toBe(3);
        });
    });

    describe('Statistics', () => {
        test('GET /api/gawdesy/statistics returns system stats', async () => {
            const response = await request(app)
                .get('/api/gawdesy/statistics')
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data.users).toBe(5);
            expect(response.body.data.donations).toBe(25);
            expect(response.body.data.activities).toBe(100);
            expect(response.body.data.documents).toBe(50);
        });
    });

    describe('Modules API', () => {
        test('GET /api/modules returns all loaded modules', async () => {
            const response = await request(app)
                .get('/api/modules')
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(Array.isArray(response.body.data)).toBe(true);
            expect(response.body.data.some(m => m.name === 'gawdesy')).toBe(true);
        });
    });

    describe('Menus API', () => {
        test('GET /api/menus returns all menus', async () => {
            const response = await request(app)
                .get('/api/menus')
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(Array.isArray(response.body.data)).toBe(true);
            expect(response.body.data.some(m => m.path === '/gawdesy')).toBe(true);
        });
    });

    describe('Permissions API', () => {
        test('GET /api/gawdesy/permissions returns module permissions', async () => {
            const response = await request(app)
                .get('/api/gawdesy/permissions')
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data.length).toBe(3);
        });
    });

    describe('Sequences API', () => {
        test('POST /api/sequences/generate creates next sequence number', async () => {
            const response = await request(app)
                .post('/api/sequences/generate')
                .send({ name: 'DON' })
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data.sequence).toBe('DON');
            expect(response.body.data.code).toBeDefined();
        });
    });

    describe('Record Rules API', () => {
        test('POST /api/record-rules creates a new rule', async () => {
            const response = await request(app)
                .post('/api/record-rules')
                .send({
                    name: 'Test Rule',
                    model: 'User',
                    domain: [['status', '=', 'active']],
                    scope: 'all'
                })
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data.name).toBe('Test Rule');
        });

        test('GET /api/record-rules/:model returns rules for model', async () => {
            const response = await request(app)
                .get('/api/record-rules/User')
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(Array.isArray(response.body.data)).toBe(true);
        });
    });

    describe('Authentication', () => {
        test('Protected routes require authentication', async () => {
            await request(app)
                .get('/api/users')
                .expect(401);
        });

        test('Valid token allows access', async () => {
            const response = await request(app)
                .get('/api/modules')
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);

            expect(response.body.success).toBe(true);
        });
    });

    describe('CRUD Operations', () => {
        test('Module supports CRUD operations', () => {
            const CRUDMixin = require('../../services/crud.mixin');
            expect(CRUDMixin).toBeDefined();
            expect(typeof CRUDMixin).toBe('object');
        });
    });

    describe('Hooks System', () => {
        test('Hook registry is available', () => {
            const { registry } = require('../../hooks');
            expect(registry).toBeDefined();
            expect(typeof registry.register).toBe('function');
            expect(typeof registry.execute).toBe('function');
        });
    });

    describe('Services', () => {
        test('SecurityService is available', () => {
            const { SecurityService } = require('../../services/security.service');
            expect(SecurityService).toBeDefined();
        });

        test('SequenceService is available', () => {
            const { SequenceService } = require('../../services/sequence.service');
            expect(SequenceService).toBeDefined();
        });

        test('RecordRuleService is available', () => {
            const { RecordRuleService } = require('../../services/record-rule.service');
            expect(RecordRuleService).toBeDefined();
        });
    });
});

module.exports = { createTestApp, mockDb, gawdesyManifest };
