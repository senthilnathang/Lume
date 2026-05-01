export const preInit = async (services) => {
  console.log('[FlowGrid] Pre-initialization');
};

export const init = async (services) => {
  console.log('[FlowGrid] Initializing node registry');
  if (services.nodeRegistry) {
    services.nodeRegistry.registerAll();
  }
};

export const postInit = async (services) => {
  console.log('[FlowGrid] Post-initialization complete');
};
