/**
 * Auth initialization plugin — restores auth state from localStorage on app boot
 */
export default defineNuxtPlugin(async () => {
  if (!import.meta.client) return;

  const { useAuthStore } = await import('~/stores/auth');
  const authStore = useAuthStore();

  authStore.initFromStorage();

  if (authStore.isLoggedIn) {
    await authStore.fetchCurrentUser();
  }
});
