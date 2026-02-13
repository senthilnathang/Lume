export default defineEventHandler((event) => {
  if (process.env.NODE_ENV !== 'development') return;

  const start = Date.now();
  const method = getMethod(event);
  const path = getRequestURL(event).pathname;

  // Skip logging for static assets and HMR
  if (path.startsWith('/_nuxt/') || path.startsWith('/__nuxt') || path.includes('.')) return;

  event.node.res.on('finish', () => {
    const duration = Date.now() - start;
    const status = event.node.res.statusCode;
    console.log(`[${method}] ${path} → ${status} (${duration}ms)`);
  });
});
