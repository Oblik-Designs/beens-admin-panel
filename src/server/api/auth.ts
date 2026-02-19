import { createServerFn } from '@tanstack/react-start'
import { useAppSession } from '../session'
import { redirect } from '@tanstack/react-router'
import { z } from 'zod'

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

export const login = createServerFn({
  method: 'POST',
})
  .inputValidator(loginSchema)
  .handler(async ({ data }) => {
    console.log('data is 2: ', data)

    const { email, password } = data as { email: string; password: string }

    console.log('email is: ', email)

    const apiBaseUrl = process.env.VITE_API_BASE_URL
    if (!apiBaseUrl) {
      throw new Error('VITE_API_BASE_URL environment variable is not set')
    }

    const url = new URL('/auth/verify-password', apiBaseUrl)
    url.searchParams.set('email', email)
    url.searchParams.set('password', password)
    url.searchParams.set('purpose', 'AUTH')

    console.log('url is: ', url.toString())
    console.log('email is: ', email)
    console.log('password is: ', password)

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      throw new Error('Login failed')
    }

    const result = await response.json()

    console.log('result is: ', result)

    if (result.success && result.data) {
      const session = await useAppSession()
      await session.update({
        accessToken: result.data.accessToken,
        refreshToken: result.data.refreshToken,
        user: result.data.user,
      })

      throw redirect({
        to: '/',
      })
    }

    throw new Error('Login failed: Invalid response')
  })

export const logout = createServerFn({
  method: 'POST',
}).handler(async () => {
  const session = await useAppSession()
  const sessionId = session.id
  await session.clear()
  // return { sessionId };
  throw redirect({ to: '/login' })
})
