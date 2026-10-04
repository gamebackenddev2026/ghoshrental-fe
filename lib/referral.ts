/** Session key for a referral code entered before Google/Apple OAuth redirect. */
export const PENDING_REFERRAL_CODE_SESSION_KEY = 'ghostrentals-pending-referral-code'

export function normalizeReferralCode(code: string): string {
  return code.trim().toUpperCase()
}

export function storePendingReferralCode(code: string): void {
  if (typeof window === 'undefined') return
  const normalized = normalizeReferralCode(code)
  if (normalized) {
    sessionStorage.setItem(PENDING_REFERRAL_CODE_SESSION_KEY, normalized)
  } else {
    sessionStorage.removeItem(PENDING_REFERRAL_CODE_SESSION_KEY)
  }
}

export function peekPendingReferralCode(): string {
  if (typeof window === 'undefined') return ''
  return normalizeReferralCode(sessionStorage.getItem(PENDING_REFERRAL_CODE_SESSION_KEY) ?? '')
}

/** Reads and clears the pending referral code from session storage. */
export function takePendingReferralCode(): string {
  const code = peekPendingReferralCode()
  if (typeof window !== 'undefined') {
    sessionStorage.removeItem(PENDING_REFERRAL_CODE_SESSION_KEY)
  }
  return code
}

export function referrerDisplayName(referrer?: {
  firstname?: string
  lastname?: string
} | null): string {
  if (!referrer) return ''
  return [referrer.firstname, referrer.lastname].filter(Boolean).join(' ').trim()
}
