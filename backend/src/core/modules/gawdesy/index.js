import manifest from './__manifest__.js';

// Module lifecycle hooks; unused args `_`-prefixed (see CODE_QUALITY.md).
const preInit = async (_db, _context) => {
    console.log('[Gawdesy Module] Pre-initialization...');
    return true;
};

const postInit = async (db, _context) => {
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
};

const postLoad = async (_db, _context) => {
    console.log('[Gawdesy Module] Loaded successfully');
    return true;
};

const uninstall = async (_db, _context) => {
    console.log('[Gawdesy Module] Uninstalling...');
    return true;
};

export { manifest, preInit, postInit, postLoad, uninstall };
export default { manifest, preInit, postInit, postLoad, uninstall };
