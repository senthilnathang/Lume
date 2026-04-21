/**
 * Auth composable for detecting admin users on the public site.
 * Checks for a JWT token in localStorage and validates it via the backend.
 * Used to enable live editing mode for admins.
 */

interface AuthUser {
  id: number
  email: string
  role: string
}

interface AuthState {
  isAdmin: boolean
  user: AuthUser | null
  token: string | null
  loading: boolean
}

const authState = reactive<AuthState>({
  isAdmin: false,
  user: null,
  token: null,
  loading: true,
})

let initialized = false

export function useAuth() {
  const config = useRuntimeConfig()

  async function checkAuth() {
    if (import.meta.server) {
      authState.loading = false
      return
    }

    const token = localStorage.getItem('lume_admin_token')
    if (!token) {
      authState.isAdmin = false
      authState.user = null
      authState.token = null
      authState.loading = false
      return
    }

    try {
      const res = await $fetch<{ success: boolean; data: { authenticated: boolean; user?: AuthUser } }>(
        `${config.public.apiBase}/auth/check`,
        { headers: { Authorization: `Bearer ${token}` } }
      )

      if (res.success && res.data.authenticated && res.data.user) {
        authState.isAdmin = true
        authState.user = res.data.user
        authState.token = token
      } else {
        clearAuth()
      }
    } catch {
      clearAuth()
    }

    authState.loading = false
  }

  function clearAuth() {
    authState.isAdmin = false
    authState.user = null
    authState.token = null
    if (import.meta.client) {
      localStorage.removeItem('lume_admin_token')
    }
  }

  function login(token: string) {
    if (import.meta.client) {
      localStorage.setItem('lume_admin_token', token)
    }
    authState.token = token
    checkAuth()
  }

  // Auto-initialize once on client
  if (import.meta.client && !initialized) {
    initialized = true
    checkAuth()
  }

  return {
    isAdmin: computed(() => authState.isAdmin),
    user: computed(() => authState.user),
    token: computed(() => authState.token),
    loading: computed(() => authState.loading),
    checkAuth,
    clearAuth,
    login,
  }
}
