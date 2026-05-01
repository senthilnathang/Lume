import { get } from './request'
import type { BackendMenuItem } from '@/stores'

export const getInstalledMenus = async (): Promise<BackendMenuItem[]> => {
  return get('/modules/installed/menus')
}
