const GUEST_DISMISS_PREFIX = 'promo_dismissed_'

function guestDismissKey(promoId: string): string {
  return `${GUEST_DISMISS_PREFIX}${promoId}`
}

/** Guest-only: check per-promo localStorage flag. */
export function isGuestPromoDismissed(promoId: string): boolean {
  if (!promoId.trim() || typeof window === 'undefined') return false
  return localStorage.getItem(guestDismissKey(promoId)) === '1'
}

/** Guest-only: persist dismiss when user closes popup or clicks CTA. */
export function dismissGuestPromo(promoId: string): void {
  if (!promoId.trim() || typeof window === 'undefined') return
  localStorage.setItem(guestDismissKey(promoId), '1')
}
