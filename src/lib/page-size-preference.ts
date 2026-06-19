const STORAGE_KEY = 'beens-admin-page-size'

export function getStoredPageSize(fallback = 10): number {
  if (typeof window === 'undefined') return fallback
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    const parsed = raw ? Number.parseInt(raw, 10) : NaN
    return Number.isFinite(parsed) && parsed >= 1 && parsed <= 100
      ? parsed
      : fallback
  } catch {
    return fallback
  }
}

export function setStoredPageSize(size: number): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(STORAGE_KEY, String(size))
  } catch {
    // ignore quota / private mode errors
  }
}
