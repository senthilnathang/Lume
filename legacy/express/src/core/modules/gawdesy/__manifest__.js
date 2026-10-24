export default {
    name: "platform-config",
    version: "1.0.0",
    summary: "Platform Configuration Module",
    description: "Core platform features including hooks, services, security, sequences, and record rules",
    author: "Lume Team",
    license: "MIT",
    depends: [],
    external_dependencies: {},
    permissions: [
        { name: "platform-config.read", description: "Read platform configuration", group: "Platform" },
        { name: "platform-config.write", description: "Write platform configuration", group: "Platform" },
        { name: "platform-config.admin", description: "Administer platform system", group: "Platform" },
        { name: "platform-config.hooks.manage", description: "Manage module hooks", group: "Platform" },
        { name: "platform-config.sequences.manage", description: "Manage document sequences", group: "Platform" },
        { name: "platform-config.record_rules.manage", description: "Manage record rules", group: "Platform" }
    ],
    menus: [
        {
            id: "platform.menu.main",
            title: "Platform",
            path: "/platform",
            icon: "settings",
            group: "Administration",
            sequence: 100
        },
        {
            id: "platform.menu.settings",
            title: "Settings",
            path: "/platform/settings",
            icon: "cog",
            parent_id: "platform.menu.main",
            group: "Administration",
            sequence: 1
        },
        {
            id: "platform.menu.sequences",
            title: "Sequences",
            path: "/platform/sequences",
            icon: "list-ol",
            parent_id: "platform.menu.main",
            group: "Administration",
            permission: "platform-config.sequences.manage",
            sequence: 2
        },
        {
            id: "platform.menu.record_rules",
            title: "Record Rules",
            path: "/platform/record-rules",
            icon: "shield",
            parent_id: "platform.menu.main",
            group: "Administration",
            permission: "platform-config.record_rules.manage",
            sequence: 3
        },
        {
            id: "platform.menu.hooks",
            title: "Hooks",
            path: "/platform/hooks",
            icon: "code",
            parent_id: "platform.menu.main",
            group: "Administration",
            permission: "platform-config.hooks.manage",
            sequence: 4
        }
    ],
    views: [
        { name: "PlatformSettings", path: "/platform/settings", component: "PlatformSettings" },
        { name: "SequenceManager", path: "/platform/sequences", component: "SequenceManager" },
        { name: "RecordRuleManager", path: "/platform/record-rules", component: "RecordRuleManager" },
        { name: "HookManager", path: "/platform/hooks", component: "HookManager" }
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
        company_name: "My Company",
        company_email: "support@example.com",
        timezone: "UTC",
        date_format: "YYYY-MM-DD",
        time_format: "HH:mm:ss",
        session_timeout: 30,
        max_upload_size: 10485760,
        allowed_file_types: ["jpg", "jpeg", "png", "gif", "pdf", "doc", "docx"]
    }
};
