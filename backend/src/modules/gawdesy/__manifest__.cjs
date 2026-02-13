module.exports = {
    name: "Gawdesy",
    technicalName: "gawdesy",
    version: "1.0.0",
    summary: "Gawdesy Management",
    description: "Gawdesy management module",
    author: "Gawdesy Team",
    license: "MIT",
    depends: ["base"],
    permissions: [
        { name: "gawdesy.read", description: "Read Gawdesy data" },
        { name: "gawdesy.write", description: "Write Gawdesy data" }
    ],
    menus: []
};
