import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export interface BackendMenuItem {
  name: string
  path: string
  icon?: string
  sequence?: number
  module?: string
  viewName?: string
  hideInMenu?: boolean
  children?: BackendMenuItem[]
}

export const useAccessStore = defineStore('access', () => {
  // State
  const token = ref<string | null>(localStorage.getItem('lume_token'))
  const accessMenus = ref<BackendMenuItem[]>([])
  const isAccessChecked = ref(false)
  const accessCodes = ref<string[]>([])

  // Computed
  const isAuthenticated = computed(() => !!token.value)

  // Actions
  const setToken = (newToken: string | null) => {
    token.value = newToken
    if (newToken) {
      localStorage.setItem('lume_token', newToken)
    } else {
      localStorage.removeItem('lume_token')
    }
  }

  const setMenus = (menus: BackendMenuItem[]) => {
    accessMenus.value = menus
  }

  const setAccessChecked = (checked: boolean) => {
    isAccessChecked.value = checked
  }

  const setAccessCodes = (codes: string[]) => {
    accessCodes.value = codes
  }

  const reset = () => {
    token.value = null
    accessMenus.value = []
    isAccessChecked.value = false
    accessCodes.value = []
    localStorage.removeItem('lume_token')
  }

  return {
    token,
    accessMenus,
    isAccessChecked,
    accessCodes,
    isAuthenticated,
    setToken,
    setMenus,
    setAccessChecked,
    setAccessCodes,
    reset
  }
})
