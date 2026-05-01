import { defineStore } from 'pinia'
import { ref } from 'vue'

export interface UserInfo {
  id?: number | string
  email?: string
  firstName?: string
  lastName?: string
  role?: string
  avatar?: string | null
}

export const useUserStore = defineStore('user', () => {
  // State
  const userInfo = ref<UserInfo | null>(null)

  // Actions
  const setUserInfo = (info: UserInfo) => {
    userInfo.value = info
  }

  const reset = () => {
    userInfo.value = null
  }

  return {
    userInfo,
    setUserInfo,
    reset
  }
})
