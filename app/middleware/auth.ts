/**
 * Auth route middleware — redirects unauthenticated users to login
 */
export default defineNuxtRouteMiddleware((to) => {
  const publicPaths = ['/auth/login', '/auth/register', '/auth/forgot-password', '/auth/reset-password'];

  if (publicPaths.some((p) => to.path.startsWith(p))) {
    return;
  }

  if (import.meta.client) {
    const token = localStorage.getItem('access_token');
    if (!token) {
      return navigateTo(`/auth/login?redirect=${encodeURIComponent(to.fullPath)}`);
    }
  }
});
