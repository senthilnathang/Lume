module.exports = {
    name: "gawdesy",
    version: "1.0.0",
    summary: "Gawdesy Enterprise Module",
    description: "Core enterprise features including hooks, services, security, sequences, and record rules",
    author: "Gawdesy Team",
    license: "MIT",
    depends: [],
    external_dependencies: {},
    permissions: [
        { name: "gawdesy.read", description: "Read Gawdesy settings", group: "Gawdesy" },
        { name: "gawdesy.write", description: "Write Gawdesy settings", group: "Gawdesy" },
        { name: "gawdesy.admin", description: "Administer Gawdesy system", group: "Gawdesy" },
        { name: "gawdesy.hooks.manage", description: "Manage module hooks", group: "Gawdesy" },
        { name: "gawdesy.sequences.manage", description: "Manage document sequences", group: "Gawdesy" },
        { name: "gawdesy.record_rules.manage", description: "Manage record rules", group: "Gawdesy" }
    ],
    menus: [
        { 
            id: "gawdesy.menu.main",
            title: "Gawdesy", 
            path: "/gawdesy", 
            icon: "settings", 
            group: "Administration",
            sequence: 100
        },
        {
            id: "gawdesy.menu.settings",
            title: "Settings",
            path: "/gawdesy/settings",
            icon: "cog",
            parent_id: "gawdesy.menu.main",
            group: "Administration",
            sequence: 1
        },
        {
            id: "gawdesy.menu.sequences",
            title: "Sequences",
            path: "/gawdesy/sequences",
            icon: "list-ol",
            parent_id: "gawdesy.menu.main",
            group: "Administration",
            permission: "gawdesy.sequences.manage",
            sequence: 2
        },
        {
            id: "gawdesy.menu.record_rules",
            title: "Record Rules",
            path: "/gawdesy/record-rules",
            icon: "shield",
            parent_id: "gawdesy.menu.main",
            group: "Administration",
            permission: "gawdesy.record_rules.manage",
            sequence: 3
        },
        {
            id: "gawdesy.menu.hooks",
            title: "Hooks",
            path: "/gawdesy/hooks",
            icon: "code",
            parent_id: "gawdesy.menu.main",
            group: "Administration",
            permission: "gawdesy.hooks.manage",
            sequence: 4
        }
    ],
    views: [
        { name: "GawdesySettings", path: "/gawdesy/settings", component: "GawdesySettings" },
        { name: "SequenceManager", path: "/gawdesy/sequences", component: "SequenceManager" },
        { name: "RecordRuleManager", path: "/gawdesy/record-rules", component: "RecordRuleManager" },
        { name: "HookManager", path: "/gawdesy/hooks", component: "HookManager" }
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
        company_name: "Gawdesy",
        company_email: "support@gawdesy.org",
        timezone: "UTC",
        date_format: "YYYY-MM-DD",
        time_format: "HH:mm:ss",
        session_timeout: 30,
        max_upload_size: 10485760,
        allowed_file_types: ["jpg", "jpeg", "png", "gif", "pdf", "doc", "docx"]
    }
};
