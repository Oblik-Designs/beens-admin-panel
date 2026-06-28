const STORAGE_KEY = 'beens-admin-page-size'
const USERS_PAGE_SIZE_KEY = 'beens-admin-users-page-size'

function readStoredSize(key: string, fallback: number): number {
  if (typeof window === 'undefined') return fallback
  try {
    const raw = localStorage.getItem(key)
    const parsed = raw ? Number.parseInt(raw, 10) : NaN
    return Number.isFinite(parsed) && parsed >= 1 && parsed <= 100
      ? parsed
      : fallback
  } catch {
    return fallback
  }
}

function writeStoredSize(key: string, size: number): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(key, String(size))
  } catch {
    // ignore quota / private mode errors
  }
}

export function getStoredPageSize(fallback = 10): number {
  return readStoredSize(STORAGE_KEY, fallback)
}

export function setStoredPageSize(size: number): void {
  writeStoredSize(STORAGE_KEY, size)
}

export function getStoredUsersPageSize(fallback = 30): number {
  return readStoredSize(USERS_PAGE_SIZE_KEY, fallback)
}

export function setStoredUsersPageSize(size: number): void {
  writeStoredSize(USERS_PAGE_SIZE_KEY, size)
}
