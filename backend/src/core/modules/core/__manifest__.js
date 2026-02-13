export default {
    name: "core",
    version: "1.0.0",
    summary: "Core Module",
    description: "Core system module with dashboard and basic functionality",
    author: "Lume Team",
    license: "MIT",
    depends: [],
    permissions: [
        { name: "dashboard.view", description: "View dashboard", group: "Core" },
    ],
    menus: [
        {
            name: "Dashboard",
            path: "/",
            icon: "home",
            sequence: 1
        }
    ],
    views: [
        { name: "Dashboard", path: "/", component: "Dashboard" }
    ],
    auto_install: true,
    state: "installed",
    sequence: 0,
};
