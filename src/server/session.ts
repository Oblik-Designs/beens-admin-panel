import { useSession } from '@tanstack/react-start/server'

// Session data type matching verifyPassword response example structure
// Based on getAuthVerify-password response example
type SessionData = {
  accessToken: string
  refreshToken: string
  user: {
    _id: string
    firstName: string
    lastName: string
    displayName: string
    profileImage: string
    role: string
    status: string
    subscription: {
      _id: string
      title: string
      image: string
      icon: string
    }
    level: {
      _id: string
      title: string
      image: string
      icon: string
    }
  }
}

export function useAppSession() {
  return useSession<SessionData>({
    name: 'beens-session',
    password: process.env.VITE_SESSION_SECRET!, // At least 32 characters
    cookie: {
      secure: process.env.VITE_NODE_ENV === 'production',
      sameSite: 'lax',
      httpOnly: true,
    },
  })
}
