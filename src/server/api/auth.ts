import { createServerFn } from '@tanstack/react-start'
import { redirect } from '@tanstack/react-router'
import { z } from 'zod'
import { useAppSession } from '../session'

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

export const login = createServerFn({
  method: 'POST',
})
  .inputValidator(loginSchema)
  .handler(async ({ data }) => {
    const { email, password } = data as { email: string; password: string }

    const apiBaseUrl = import.meta.env.VITE_API_BASE_URL
    if (!apiBaseUrl) {
      throw new Error('VITE_API_BASE_URL environment variable is not set')
    }

    const url = new URL('/v1/auth/verify-password', apiBaseUrl)

    const response = await fetch(url.toString(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password, purpose: 'AUTH' }),
    })

    if (!response.ok) {
      throw new Error('Login failed')
    }

    const result = await response.json()

    if (!result.success || !result.data?.accessToken) {
      throw new Error('Login failed: Invalid response')
    }

    const { accessToken, refreshToken } = result.data as {
      accessToken: string
      refreshToken: string
    }

    const profileUrl = new URL('/v1/user/profile', apiBaseUrl)
    const profileResponse = await fetch(profileUrl.toString(), {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        authorization: `Bearer ${accessToken}`,
      },
    })

    if (!profileResponse.ok) {
      throw new Error('Login failed: Could not load profile')
    }

    const profileResult = await profileResponse.json()
    if (!profileResult.success || !profileResult.data?._id) {
      throw new Error('Login failed: Invalid profile response')
    }

    const session = await useAppSession()
    await session.update({
      accessToken,
      refreshToken,
      user: profileResult.data,
    })

    throw redirect({ to: '/' })
  })

export const logout = createServerFn({
  method: 'POST',
}).handler(async () => {
  const session = await useAppSession()
  await session.clear()
  throw redirect({ to: '/login' })
})
