import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Security: Escape HTML entities to prevent XSS
 * Server-side safe version (doesn't require DOM)
 */
export function escapeHtml(text: string | null | undefined): string {
  if (!text) return ''
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

/**
 * Trigger a refresh event for a specific table or all tables
 * This will cause useSupabaseSubscription hooks to refetch their data
 * @param tableName Optional table name to refresh. If not provided, refreshes all tables
 */
export function triggerRefresh(tableName?: string) {
  if (typeof window === 'undefined') return;
  
  if (tableName) {
    window.dispatchEvent(new CustomEvent(`refresh-${tableName}`, { detail: { table: tableName } }));
  } else {
    window.dispatchEvent(new CustomEvent('refresh-all', { detail: {} }));
  }
}
