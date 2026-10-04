export const B2C_DEFAULT_DISCOUNT_PERCENT = 2.5
export const B2B_DEFAULT_DISCOUNT_PERCENT = 20
export const DISCOUNT_TOAST_SESSION_KEY = 'ghostrentals-discount-toast'

export type StoredCustomer = {
  account_type?: 'b2b' | 'b2c' | string
  discount_percent?: number | string
  verification_status?: string
}

export function readStoredCustomer(): StoredCustomer | null {
  if (typeof window === 'undefined') return null
  const raw = localStorage.getItem('customer')
  if (!raw) return null
  try {
    return JSON.parse(raw) as StoredCustomer
  } catch {
    return null
  }
}

export function formatDiscountPercent(percent: number): string {
  const rounded = Math.round(percent * 10) / 10
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1)
}

export function resolveCustomerDiscountPercent(customer?: StoredCustomer | null): number | null {
  if (!customer) return null

  // B2B pricing only unlocks once admin verification of business documents is approved.
  if (customer.account_type === 'b2b' && customer.verification_status !== 'approved') {
    return null
  }

  const fromApi = customer.discount_percent
  if (typeof fromApi === 'number' && fromApi > 0) return fromApi
  if (typeof fromApi === 'string' && fromApi.trim()) {
    const parsed = Number(fromApi)
    if (Number.isFinite(parsed) && parsed > 0) return parsed
  }

  if (customer.account_type === 'b2b') return B2B_DEFAULT_DISCOUNT_PERCENT
  if (customer.account_type === 'b2c') return B2C_DEFAULT_DISCOUNT_PERCENT
  return null
}

export function hasMemberPriceDrop(regular: number, current: number): boolean {
  return regular > current && current > 0
}

export function resolveDiscountPercentFromRates(regular: number, current: number): number | null {
  if (!hasMemberPriceDrop(regular, current)) return null
  return Math.round(((regular - current) / regular) * 1000) / 10
}

export function buildMemberDiscountToastMessage(percent: number, accountType?: string): string {
  const label = accountType === 'b2b' ? 'business' : accountType === 'b2c' ? 'member' : 'member'
  return `Your ${formatDiscountPercent(percent)}% ${label} discount has been applied to prices.`
}

export function buildMemberDiscountLabel(percent: number): string {
  return `${formatDiscountPercent(percent)}% discount applied`
}

export function queueCustomerDiscountToast(customer: Record<string, unknown>) {
  if (typeof window === 'undefined') return
  const percent = resolveCustomerDiscountPercent(customer as StoredCustomer)
  if (!percent) return
  sessionStorage.setItem(DISCOUNT_TOAST_SESSION_KEY, buildMemberDiscountToastMessage(percent, String(customer.account_type ?? '')))
}

export function consumeQueuedDiscountToast(): string | null {
  if (typeof window === 'undefined') return null
  const message = sessionStorage.getItem(DISCOUNT_TOAST_SESSION_KEY)
  if (!message) return null
  sessionStorage.removeItem(DISCOUNT_TOAST_SESSION_KEY)
  return message
}
