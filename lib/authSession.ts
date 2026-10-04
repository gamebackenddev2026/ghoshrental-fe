import { AUTH_TOKEN_KEY, notifyAuthChanged } from './authToken'
import { queueCustomerDiscountToast } from './customerDiscount'

export const AUTH_COOKIE_KEY = 'ghostrentals-web-token'
const CUSTOMER_STORAGE_KEY = 'customer'
const SESSION_MAX_AGE_SEC = 60 * 60 * 24 * 30

/** Persist JWT + customer profile in localStorage and a readable cookie for server components. */
export function persistAuthSession(token: string, customer: Record<string, unknown> = {}) {
  if (typeof window === 'undefined') return

  localStorage.setItem(AUTH_TOKEN_KEY, token)
  localStorage.setItem(CUSTOMER_STORAGE_KEY, JSON.stringify(customer))
  document.cookie = `${AUTH_COOKIE_KEY}=${encodeURIComponent(token)}; path=/; max-age=${SESSION_MAX_AGE_SEC}; SameSite=Lax`
  queueCustomerDiscountToast(customer)
  notifyAuthChanged()
  window.dispatchEvent(new Event('storage'))
}

export function clearAuthSession() {
  if (typeof window === 'undefined') return

  localStorage.removeItem(AUTH_TOKEN_KEY)
  localStorage.removeItem(CUSTOMER_STORAGE_KEY)
  localStorage.removeItem('guest')
  document.cookie = `${AUTH_COOKIE_KEY}=; path=/; max-age=0; SameSite=Lax`
  notifyAuthChanged()
}
