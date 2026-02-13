const express = require('express');

const createLumeRoutes = (db) => {
    const router = express.Router();

    router.get('/info', async (req, res) => {
        const manifest = require('./__manifest__');
        res.json({
            success: true,
            data: {
                name: manifest.name,
                version: manifest.version,
                tagline: 'Modular Light Framework',
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

    router.get('/health', async (req, res) => {
        res.json({
            success: true,
            status: 'healthy',
            framework: 'Lume',
            version: '1.0.0',
            uptime: process.uptime(),
            memory: process.memoryUsage()
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
        const manifest = require('./__manifest__');
        const userMenus = global.__MENUS__ || [];
        const allMenus = [...userMenus, ...manifest.menus];
        
        res.json({
            success: true,
            data: allMenus
        });
    });

    router.get('/permissions', async (req, res) => {
        const manifest = require('./__manifest__');
        res.json({
            success: true,
            data: manifest.permissions
        });
    });

    router.get('/settings', async (req, res) => {
        const manifest = require('./__manifest__');
        res.json({
            success: true,
            data: manifest.settings
        });
    });

    return router;
};

module.exports = { createLumeRoutes };
