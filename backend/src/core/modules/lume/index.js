const manifest = require('./__manifest__');
const { LumeService, createLumeRouter } = require('./lume.service');
const { createLumeRoutes } = require('./routes');

module.exports = {
    manifest,
    LumeService,
    createLumeRouter,
    createLumeRoutes,

    preInit: async (db, context) => {
        console.log('[Lume Module] Pre-initialization...');
        return true;
    },

    postInit: async (db, context) => {
        console.log('[Lume Module] Post-initialization...');
        
        try {
            const { Setting } = db.models;
            
            const defaultSettings = manifest.settings;
            for (const [key, value] of Object.entries(defaultSettings)) {
                const settingKey = `lume.${key}`;
                await Setting.findOrCreate({
                    where: { key: settingKey },
                    defaults: {
                        key: settingKey,
                        value: JSON.stringify(value),
                        type: typeof value
                    }
                });
            }
            
            console.log('[Lume Module] Default settings created');
        } catch (error) {
            console.log('[Lume Module] Settings already exist or database not connected');
        }

        return true;
    },

    postLoad: async (db, context) => {
        console.log('[Lume Module] Loaded successfully');
        return true;
    },

    uninstall: async (db, context) => {
        console.log('[Lume Module] Uninstalling...');
        return true;
    }
};
