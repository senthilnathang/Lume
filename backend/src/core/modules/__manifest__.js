export default {
    name: "Lume Core",
    version: "1.0.0",
    summary: "Core module system with hooks, services, and security",
    description: "Enterprise module system with dynamic loading, lifecycle hooks, and service layer",
    depends: [],
    external_dependencies: {},
    permissions: [
        { name: "platform-config.read", description: "Read platform configuration" },
        { name: "platform-config.write", description: "Write platform configuration" },
        { name: "platform-config.admin", description: "Administer platform system" }
    ],
    menus: [
        { name: "platform.menu", path: "/platform", title: "Platform", icon: "settings" }
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
