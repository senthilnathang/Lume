const manifest = require('./__manifest__');
const { GawdesyService, createGawdesyRouter } = require('./gawdesy.service');
const { createGawdesyRoutes } = require('./routes');

module.exports = {
    manifest,
    GawdesyService,
    createGawdesyRouter,
    createGawdesyRoutes,

    preInit: async (db, context) => {
        console.log('[Gawdesy Module] Pre-initialization...');
        return true;
    },

    postInit: async (db, context) => {
        console.log('[Gawdesy Module] Post-initialization...');
        
        try {
            const { Setting } = db.models;
            
            const defaultSettings = manifest.settings;
            for (const [key, value] of Object.entries(defaultSettings)) {
                const settingKey = `gawdesy.${key}`;
                await Setting.findOrCreate({
                    where: { key: settingKey },
                    defaults: {
                        key: settingKey,
                        value: JSON.stringify(value),
                        type: typeof value
                    }
                });
            }
            
            console.log('[Gawdesy Module] Default settings created');
        } catch (error) {
            console.log('[Gawdesy Module] Settings already exist or database not connected');
        }

        return true;
    },

    postLoad: async (db, context) => {
        console.log('[Gawdesy Module] Loaded successfully');
        return true;
    },

    uninstall: async (db, context) => {
        console.log('[Gawdesy Module] Uninstalling...');
        return true;
    }
};
