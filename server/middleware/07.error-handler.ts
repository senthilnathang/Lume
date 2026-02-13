export default defineEventHandler((event) => {
  // This middleware is a catch-all for unhandled errors in API routes.
  // Nitro/h3 has built-in error handling, but this ensures a consistent format.
  // It hooks into the response to intercept 500s.

  event.node.res.on('finish', () => {
    const status = event.node.res.statusCode;
    if (status >= 500) {
      const path = getRequestURL(event).pathname;
      const method = getMethod(event);
      console.error(`[ERROR] ${method} ${path} responded with ${status}`);
    }
  });
});
