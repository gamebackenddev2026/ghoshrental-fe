export const AUTH_TOKEN_KEY = 'ghostrentals-web-token'
export const AUTH_CHANGED_EVENT = 'ghostrentals-auth-changed'

/** Reads the customer JWT from localStorage (browser only). */
export function getClientAuthToken(): string | undefined {
  if (typeof window === 'undefined') return undefined
  const token = localStorage.getItem(AUTH_TOKEN_KEY)?.trim()
  return token || undefined
}

export function notifyAuthChanged() {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new Event(AUTH_CHANGED_EVENT))
}
