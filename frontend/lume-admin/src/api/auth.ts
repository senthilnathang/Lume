import { get, post } from './request'

export const loginApi = async (email: string, password: string) => {
  return post('/users/login', { email, password })
}

export const getMeApi = async () => {
  return get('/users/me')
}

export const logoutApi = async () => {
  return post('/users/logout', {})
}
