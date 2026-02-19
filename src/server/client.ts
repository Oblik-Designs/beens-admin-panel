import { useAppSession } from './session'

const getApiBaseUrl = () => {
  const apiBaseUrl = process.env.VITE_API_BASE_URL
  if (!apiBaseUrl) {
    throw new Error('VITE_API_BASE_URL environment variable is not set')
  }
  return apiBaseUrl
}

const getAuthHeaders = async (
  customHeaders?: HeadersInit,
): Promise<HeadersInit> => {
  const session = await useAppSession()
  const accessToken = session.data?.accessToken

  const headers = new Headers(customHeaders)
  headers.set('Content-Type', 'application/json')

  if (accessToken) {
    headers.set('Authorization', `Bearer ${accessToken}`)
  }

  return headers
}

const buildUrl = (endpoint: string, baseUrl?: string) => {
  const base = baseUrl || getApiBaseUrl()
  return new URL(endpoint, base).toString()
}

const getSessionId = async (): Promise<string> => {
  const session = await useAppSession()
  const sessionId = (session as any).id
  if (sessionId) return sessionId

  const userId = session.data?.user?._id
  if (userId) return `user:${userId}`

  return 'default'
}

type SessionRefreshState = {
  refreshPromise: Promise<void> | null
  requestQueue: Array<() => Promise<unknown>>
}

const sessionRefreshMap = new Map<string, SessionRefreshState>()

const getSessionRefreshState = async (): Promise<SessionRefreshState> => {
  const sessionId = await getSessionId()
  if (!sessionRefreshMap.has(sessionId)) {
    sessionRefreshMap.set(sessionId, {
      refreshPromise: null,
      requestQueue: [],
    })
  }
  return sessionRefreshMap.get(sessionId)!
}

const refreshToken = async (): Promise<void> => {
  const session = await useAppSession()
  const refreshToken = session.data?.refreshToken

  if (!refreshToken) {
    throw new Error('No refresh token available')
  }

  const response = await fetch(buildUrl('/auth/refresh-token'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ refreshToken }),
  })

  if (!response.ok) {
    throw new Error('Token refresh failed')
  }

  const result = await response.json()

  if (result.success && result.data) {
    await session.update({
      accessToken: result.data.accessToken,
      refreshToken: result.data.refreshToken || refreshToken,
      user: session.data?.user,
    })
  } else {
    throw new Error('Token refresh failed: Invalid response')
  }
}

const handleTokenRefresh = async (): Promise<void> => {
  const state = await getSessionRefreshState()

  if (state.refreshPromise) {
    return state.refreshPromise
  }

  state.refreshPromise = (async () => {
    try {
      await refreshToken()
      const queue = [...state.requestQueue]
      state.requestQueue.length = 0
      for (const retry of queue) {
        await retry()
      }
    } catch (error) {
      state.requestQueue.length = 0
      throw error
    } finally {
      state.refreshPromise = null
    }
  })()

  return state.refreshPromise
}

const isTokenExpired = (status: number) => status === 401 || status === 403

const executeRequest = async <T>(
  endpoint: string,
  method: string,
  data?: unknown,
  options?: RequestInit,
): Promise<T> => {
  const headers = await getAuthHeaders(options?.headers)
  const response = await fetch(buildUrl(endpoint), {
    ...options,
    method,
    headers,
    body: data ? JSON.stringify(data) : undefined,
  })

  if (!response.ok) {
    if (isTokenExpired(response.status)) {
      const state = await getSessionRefreshState()

      return new Promise<T>((resolve, reject) => {
        const retry = async () => {
          try {
            const retryHeaders = await getAuthHeaders(options?.headers)
            const retryResponse = await fetch(buildUrl(endpoint), {
              ...options,
              method,
              headers: retryHeaders,
              body: data ? JSON.stringify(data) : undefined,
            })

            if (!retryResponse.ok) {
              throw new Error(`API request failed: ${retryResponse.statusText}`)
            }

            resolve(await retryResponse.json())
          } catch (err) {
            reject(err)
          }
        }

        state.requestQueue.push(retry)

        if (!state.refreshPromise) {
          handleTokenRefresh().catch(reject)
        } else {
          state.refreshPromise.catch(reject)
        }
      })
    }

    throw new Error(`API request failed: ${response.statusText}`)
  }

  return response.json()
}

export const apiClient = {
  async get<T = unknown>(endpoint: string, options?: RequestInit): Promise<T> {
    return executeRequest<T>(endpoint, 'GET', undefined, options)
  },

  async post<T = unknown>(
    endpoint: string,
    data?: unknown,
    options?: RequestInit,
  ): Promise<T> {
    return executeRequest<T>(endpoint, 'POST', data, options)
  },

  async put<T = unknown>(
    endpoint: string,
    data?: unknown,
    options?: RequestInit,
  ): Promise<T> {
    return executeRequest<T>(endpoint, 'PUT', data, options)
  },

  async patch<T = unknown>(
    endpoint: string,
    data?: unknown,
    options?: RequestInit,
  ): Promise<T> {
    return executeRequest<T>(endpoint, 'PATCH', data, options)
  },

  async delete<T = unknown>(
    endpoint: string,
    options?: RequestInit,
  ): Promise<T> {
    return executeRequest<T>(endpoint, 'DELETE', undefined, options)
  },
}
