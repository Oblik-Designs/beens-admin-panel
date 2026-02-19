import { mutationOptions } from '@tanstack/react-query'
import { login, logout } from '@/server/api/auth'

export const loginOptions = mutationOptions({
  mutationKey: ['login'],
  mutationFn: async (data: { email: string; password: string }) => {
    console.log('data is: ', { data })
    return await login({ data })
  },
})

export const logoutOptions = mutationOptions({
  mutationKey: ['logout'],
  mutationFn: async () => {
    return await logout()
  },
})
