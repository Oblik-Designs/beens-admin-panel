import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Converts SCREAMING_SNAKE_CASE to Title Case.
 * @example formatLabel('REPORT_USER') // 'Report User'
 */
export function formatLabel(text: string): string {
  if (!text || typeof text !== 'string') return ''
  return text
    .split(/[_\s-]+/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ')
}
