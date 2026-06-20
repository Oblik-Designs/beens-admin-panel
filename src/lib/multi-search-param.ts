/** Parse URL search values into a deduped list (comma-separated or repeated keys). */
export function parseMultiSearchParam<T extends string>(
  value: unknown,
  allowed: ReadonlyArray<T>,
): Array<T> {
  if (
    value === undefined ||
    value === null ||
    value === '' ||
    value === '[]'
  ) {
    return []
  }

  if (Array.isArray(value) && value.length === 0) return []

  const raw = Array.isArray(value)
    ? value.flatMap((entry) => String(entry).split(','))
    : String(value).split(',')

  const seen = new Set<T>()
  for (const part of raw) {
    const trimmed = part.trim()
    if (allowed.includes(trimmed as T)) {
      seen.add(trimmed as T)
    }
  }

  return [...seen]
}

export function serializeMultiSearchParam<T extends string>(
  values: ReadonlyArray<T>,
): string | undefined {
  return values.length > 0 ? values.join(',') : undefined
}
