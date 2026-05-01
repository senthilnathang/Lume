import manifest from './__manifest__.js';

const preInit = async (db, context) => {
    console.log('[Lume Module] Pre-initialization...');
    return true;
};

const postInit = async (db, context) => {
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
};

const postLoad = async (db, context) => {
    console.log('[Lume Module] Loaded successfully');
    return true;
};

const uninstall = async (db, context) => {
    console.log('[Lume Module] Uninstalling...');
    return true;
};

export { manifest, preInit, postInit, postLoad, uninstall };
export default { manifest, preInit, postInit, postLoad, uninstall };
