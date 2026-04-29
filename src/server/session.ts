import { useSession } from '@tanstack/react-start/server'

// Stores tokens plus a snapshot of /user/profile.
// Profile payload keeps growing on the backend, so we type loosely:
// _id is the only field consumed server-side; everything else is forwarded.
export type SessionUser = {
  _id: string
  firstName?: string
  lastName?: string
  displayName?: string
  profileImage?: string
  role?: string
  status?: string
  subscription?: Record<string, unknown> | null
  [key: string]: unknown
}

type SessionData = {
  accessToken: string
  refreshToken: string
  user: SessionUser
}

export function useAppSession() {
  return useSession<SessionData>({
    name: 'beens-session',
    password: import.meta.env.VITE_SESSION_SECRET!, // At least 32 characters
    cookie: {
      secure: import.meta.env.VITE_NODE_ENV === 'production',
      sameSite: 'lax',
      httpOnly: true,
    },
  })
}
