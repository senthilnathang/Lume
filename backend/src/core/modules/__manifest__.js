export default {
    name: "Gawdesy Core",
    version: "1.0.0",
    summary: "Core module system with hooks, services, and security",
    description: "Enterprise module system with dynamic loading, lifecycle hooks, and service layer",
    depends: [],
    external_dependencies: {},
    permissions: [
        { name: "gawdesy.read", description: "Read Gawdesy settings" },
        { name: "gawdesy.write", description: "Write Gawdesy settings" },
        { name: "gawdesy.admin", description: "Administer Gawdesy system" }
    ],
    menus: [
        { name: "gawdesy.menu", path: "/gawdesy", title: "Gawdesy", icon: "settings" }
    ],
    hooks: {
        pre_init_hook: "preInit",
        post_init_hook: "postInit",
        post_load_hook: "postLoad",
        uninstall_hook: "uninstall"
    },
    auto_install: true,
    state: "installed"
};
