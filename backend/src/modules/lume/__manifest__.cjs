module.exports = {
    name: "Lume",
    version: "1.0.0",
    summary: "Lume - Modular Framework",
    description: "Enterprise modular framework for Vue.js applications",
    author: "Lume Team",
    license: "MIT",
    depends: [],
    permissions: [
        { name: "lume.read", description: "Read Lume settings" },
        { name: "lume.write", description: "Write Lume settings" },
        { name: "lume.admin", description: "Administer Lume system" }
    ],
    menus: [
        {
            name: "Dashboard",
            title: "Dashboard",
            path: "/dashboard",
            icon: "home",
            sequence: 1
        },
        {
            name: "LumeSettings",
            title: "Lume Settings",
            path: "/lume/settings",
            icon: "settings",
            sequence: 100
        }
    ]
};
