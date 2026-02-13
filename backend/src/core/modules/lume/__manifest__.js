export default {
    name: "lume",
    version: "1.0.0",
    summary: "Lume - Modular Vue.js Framework",
    description: "Enterprise modular framework for Nuxt/Vue.js applications with dynamic module loading, RBAC, hooks, sequences, and record rules",
    author: "Lume Team",
    license: "MIT",
    depends: [],
    external_dependencies: {},
    permissions: [
        { name: "lume.read", description: "Read Lume settings", group: "Lume" },
        { name: "lume.write", description: "Write Lume settings", group: "Lume" },
        { name: "lume.admin", description: "Administer Lume system", group: "Lume" },
        { name: "lume.hooks.manage", description: "Manage module hooks", group: "Lume" },
        { name: "lume.sequences.manage", description: "Manage document sequences", group: "Lume" },
        { name: "lume.record_rules.manage", description: "Manage record rules", group: "Lume" }
    ],
    menus: [
        { 
            id: "lume.menu.main",
            title: "Lume", 
            path: "/lume", 
            icon: "settings", 
            group: "Administration",
            sequence: 100
        },
        {
            id: "lume.menu.settings",
            title: "Settings",
            path: "/lume/settings",
            icon: "cog",
            parent_id: "lume.menu.main",
            group: "Administration",
            sequence: 1
        },
        {
            id: "lume.menu.sequences",
            title: "Sequences",
            path: "/lume/sequences",
            icon: "list-ol",
            parent_id: "lume.menu.main",
            group: "Administration",
            permission: "lume.sequences.manage",
            sequence: 2
        },
        {
            id: "lume.menu.record_rules",
            title: "Record Rules",
            path: "/lume/record-rules",
            icon: "shield",
            parent_id: "lume.menu.main",
            group: "Administration",
            permission: "lume.record_rules.manage",
            sequence: 3
        },
        {
            id: "lume.menu.hooks",
            title: "Hooks",
            path: "/lume/hooks",
            icon: "code",
            parent_id: "lume.menu.main",
            group: "Administration",
            permission: "lume.hooks.manage",
            sequence: 4
        }
    ],
    views: [
        { name: "LumeSettings", path: "/lume/settings", component: "LumeSettings" },
        { name: "SequenceManager", path: "/lume/sequences", component: "SequenceManager" },
        { name: "RecordRuleManager", path: "/lume/record-rules", component: "RecordRuleManager" },
        { name: "HookManager", path: "/lume/hooks", component: "HookManager" }
    ],
    hooks: {
        pre_init_hook: "preInit",
        post_init_hook: "postInit",
        post_load_hook: "postLoad",
        uninstall_hook: "uninstall"
    },
    auto_install: true,
    state: "installed",
    sequence: 1,
    installed_at: new Date().toISOString(),
    settings: {
        app_name: "Lume",
        app_email: "support@lume.dev",
        timezone: "UTC",
        date_format: "YYYY-MM-DD",
        time_format: "HH:mm:ss",
        session_timeout: 30,
        max_upload_size: 10485760,
        allowed_file_types: ["jpg", "jpeg", "png", "gif", "pdf", "doc", "docx"]
    }
};
