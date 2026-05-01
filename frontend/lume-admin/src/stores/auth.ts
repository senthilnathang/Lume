import { defineStore } from 'pinia'
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { message } from 'ant-design-vue'
import { loginApi, logoutApi, getMeApi } from '@/api/auth'
import { useAccessStore } from './access'
import { useUserStore } from './user'

export const useAuthStore = defineStore('auth', () => {
  const router = useRouter()
  const accessStore = useAccessStore()
  const userStore = useUserStore()

  // State
  const loading = ref(false)
  const error = ref<string | null>(null)

  // Actions
  const login = async (email: string, password: string) => {
    loading.value = true
    error.value = null

    try {
      const response = await loginApi(email, password)

      if (response.token) {
        // Set token
        accessStore.setToken(response.token)

        // Set user info
        if (response.user) {
          userStore.setUserInfo({
            id: response.user.id,
            email: response.user.email,
            firstName: response.user.first_name,
            lastName: response.user.last_name,
            role: response.user.role,
            avatar: response.user.avatar
          })
        }

        return true
      }

      error.value = response.error || 'Login failed'
      return false
    } catch (err: any) {
      const errorMsg = err?.message || 'Login failed'
      error.value = errorMsg
      message.error(errorMsg)
      return false
    } finally {
      loading.value = false
    }
  }

  const logout = async () => {
    try {
      await logoutApi()
    } catch (err) {
      console.error('Logout error:', err)
    }

    // Clear stores
    accessStore.reset()
    userStore.reset()
    error.value = null

    // Redirect to login
    await router.push('/login')
  }

  const fetchUserInfo = async () => {
    try {
      const user = await getMeApi()
      if (user) {
        userStore.setUserInfo({
          id: user.id,
          email: user.email,
          firstName: user.first_name,
          lastName: user.last_name,
          role: user.role,
          avatar: user.avatar
        })
        return true
      }
      return false
    } catch (err) {
      console.error('Fetch user info error:', err)
      return false
    }
  }

  return {
    loading,
    error,
    login,
    logout,
    fetchUserInfo
  }
})
