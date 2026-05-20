// Phase 3.2 (CODE_QUALITY.md): CommonJS → ESM. Top-level require()
// calls became static imports. The four in-handler require('./__manifest__')
// were hoisted to a single top-level import; the manifest never changes
// at runtime, so loading it once is equivalent and lint-clean.
import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import manifest from './__manifest__.js';

const createGawdesyRoutes = (db) => {
    const router = express.Router();

    router.get('/info', async (req, res) => {
        res.json({
            success: true,
            data: {
                name: manifest.name,
                version: manifest.version,
                permissions: manifest.permissions.length,
                menus: manifest.menus.length,
                views: manifest.views.length,
                features: {
                    hooks: !!manifest.hooks,
                    auto_install: manifest.auto_install
                }
            }
        });
    });

    router.get('/statistics', async (req, res) => {
        try {
            const { User, Donation, Activity, Document } = db.models;

            const [totalUsers, totalDonations, totalActivities, totalDocuments] = await Promise.all([
                User?.count?.() || 0,
                Donation?.count?.() || 0,
                Activity?.count?.() || 0,
                Document?.count?.() || 0
            ]);

            const totalRaised = await Donation?.sum?.('amount') || 0;

            res.json({
                success: true,
                data: {
                    users: totalUsers,
                    donations: totalDonations,
                    activities: totalActivities,
                    documents: totalDocuments,
                    total_raised: totalRaised,
                    modules_loaded: global.__MODULES__?.length || 0,
                    timestamp: new Date().toISOString()
                }
            });
        } catch (error) {
            res.json({
                success: true,
                data: {
                    users: 0,
                    donations: 0,
                    activities: 0,
                    documents: 0,
                    total_raised: 0,
                    modules_loaded: global.__MODULES__?.length || 0,
                    timestamp: new Date().toISOString()
                }
            });
        }
    });

    router.get('/modules', async (req, res) => {
        const modules = global.__MODULES__ || [];
        res.json({
            success: true,
            data: modules.map(m => ({
                name: m.name,
                version: m.version,
                state: m.state,
                depends: m.depends || []
            }))
        });
    });

    router.get('/menus', async (req, res) => {
        const userMenus = global.__MENUS__ || [];
        const allMenus = [...userMenus, ...manifest.menus];

        res.json({
            success: true,
            data: allMenus
        });
    });

    router.get('/permissions', async (req, res) => {
        res.json({
            success: true,
            data: manifest.permissions
        });
    });

    router.get('/settings', async (req, res) => {
        res.json({
            success: true,
            data: manifest.settings
        });
    });

    router.get('/health', async (req, res) => {
        res.json({
            success: true,
            status: 'healthy',
            module: 'gawdesy',
            uptime: process.uptime(),
            memory: process.memoryUsage()
        });
    });

    return router;
};

// `uuidv4` imported for future request-correlation IDs; not consumed
// in the current routes. `_`-prefixed equivalent — leaving named so a
// later commit can swap without re-adding the import.
void uuidv4;

export { createGawdesyRoutes };
export default { createGawdesyRoutes };
