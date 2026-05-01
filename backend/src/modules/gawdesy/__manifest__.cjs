module.exports = {
    name: "Platform Config",
    technicalName: "platform-config",
    version: "1.0.0",
    summary: "Platform Configuration Management",
    description: "Platform configuration management module",
    author: "Lume Team",
    license: "MIT",
    depends: ["base"],
    permissions: [
        { name: "platform-config.read", description: "Read platform configuration" },
        { name: "platform-config.write", description: "Write platform configuration" }
    ],
    menus: []
};
