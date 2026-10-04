import { getMyMembership, toMyMembershipStatus, type MyMembershipStatus } from '@/lib/api/membership'

/**
 * Client-side cache of the logged-in customer's membership status so the
 * header badge and account pages don't each refetch it on every mount.
 */
export const MEMBERSHIP_STORAGE_KEY = 'ghostrentals-membership-v2'
export const MEMBERSHIP_CHANGED_EVENT = 'ghostrentals-membership-changed'

const CACHE_MAX_AGE_MS = 5 * 60 * 1000

type StoredMembership = MyMembershipStatus & { fetchedAt: number }

export function readStoredMembership(): MyMembershipStatus | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(MEMBERSHIP_STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as StoredMembership
    return typeof parsed === 'object' && parsed !== null ? parsed : null
  } catch {
    return null
  }
}

export function clearStoredMembership() {
  if (typeof window === 'undefined') return
  localStorage.removeItem(MEMBERSHIP_STORAGE_KEY)
  window.dispatchEvent(new Event(MEMBERSHIP_CHANGED_EVENT))
}

function isFresh(stored: MyMembershipStatus | null): boolean {
  const fetchedAt = (stored as StoredMembership | null)?.fetchedAt
  return typeof fetchedAt === 'number' && Date.now() - fetchedAt < CACHE_MAX_AGE_MS
}

/**
 * Fetch the latest membership status from the backend and cache it.
 * Pass `force: true` right after checkout so the new subscription shows
 * immediately; otherwise a fresh (<5 min) cache is returned as-is.
 */
export async function refreshMembershipStatus(token: string, options: { force?: boolean } = {}): Promise<MyMembershipStatus | null> {
  if (typeof window === 'undefined' || !token) return null

  const cached = readStoredMembership()
  if (!options.force && isFresh(cached)) return cached

  try {
    const res = await getMyMembership(token)
    if (res.code !== 200) return cached
    const status = toMyMembershipStatus(res.result)
    const stored: StoredMembership = { ...status, fetchedAt: Date.now() }
    localStorage.setItem(MEMBERSHIP_STORAGE_KEY, JSON.stringify(stored))
    window.dispatchEvent(new Event(MEMBERSHIP_CHANGED_EVENT))
    return status
  } catch {
    // Endpoint unavailable / network error — keep whatever we had.
    return cached
  }
}
