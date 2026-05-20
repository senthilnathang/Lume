// Module lifecycle hooks. Unused `services` args underscored per the
// project lint convention (CODE_QUALITY.md).
export const preInit = async (_services) => {
  console.log('[FlowGrid] Pre-initialization');
};

export const init = async (services) => {
  console.log('[FlowGrid] Initializing node registry');
  if (services.nodeRegistry) {
    services.nodeRegistry.registerAll();
  }
};

export const postInit = async (_services) => {
  console.log('[FlowGrid] Post-initialization complete');
};
