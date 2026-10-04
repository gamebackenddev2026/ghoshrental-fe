'use client'

import { useEffect } from 'react'
import { getFrontCustomerData } from '@/lib/api/auth'
import { AUTH_COOKIE_KEY, persistAuthSession } from '@/lib/authSession'
import { getClientAuthToken } from '@/lib/authToken'
import { refreshMembershipStatus } from '@/lib/membershipStatus'

function readAuthCookie(): string | undefined {
  if (typeof document === 'undefined') return undefined
  const match = document.cookie.match(new RegExp(`(?:^|;\\s*)${AUTH_COOKIE_KEY}=([^;]+)`))
  const value = match ? decodeURIComponent(match[1]).trim() : ''
  return value || undefined
}

/** Best-effort customer id from the JWT payload (no verification needed client-side). */
function customerIdFromJwt(token: string): string {
  try {
    const payload = token.split('.')[1]
    if (!payload) return ''
    const json = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/'))) as Record<string, unknown>
    const id = json.id ?? json._id ?? json.customer_id ?? json.customerId ?? json.sub
    return typeof id === 'string' ? id : ''
  } catch {
    return ''
  }
}

function readStoredCustomer(): Record<string, unknown> {
  try {
    const raw = localStorage.getItem('customer')
    return raw ? (JSON.parse(raw) as Record<string, unknown>) : {}
  } catch {
    return {}
  }
}

/**
 * Mounted on the membership payment success page.
 *
 * MamoPay sends the customer back via a full top-level navigation, which can
 * land with localStorage intact but stale, or (in some browser privacy modes)
 * with localStorage dropped while the auth cookie survives. This component:
 *
 * 1. Restores the session from the auth cookie if localStorage lost the token,
 *    so the user stays logged in instead of appearing logged out.
 * 2. Re-fetches the customer profile so the stored customer object picks up
 *    whatever the webhook wrote (membership, points, discounts).
 * 3. Force-refreshes the cached membership status so the header badge and
 *    profile page show the new subscription immediately.
 */
export function MembershipSessionSync() {
  useEffect(() => {
    let cancelled = false

    const sync = async () => {
      let token = getClientAuthToken()

      if (!token) {
        const cookieToken = readAuthCookie()
        if (!cookieToken) return // Genuinely signed out — nothing to restore.
        token = cookieToken
        // Re-seed localStorage right away so the header shows the user as
        // logged in even before the profile fetch below completes.
        persistAuthSession(token, readStoredCustomer())
      }

      const stored = readStoredCustomer()
      const customerId = (typeof stored._id === 'string' && stored._id) || customerIdFromJwt(token)

      if (customerId) {
        try {
          const res = await getFrontCustomerData({ customer_id: customerId }, token)
          if (!cancelled && res.code === 200 && res.result && typeof res.result === 'object') {
            persistAuthSession(token, { ...stored, ...res.result, _id: customerId })
          }
        } catch {
          // Profile refresh is best-effort; the session itself is already restored.
        }
      }

      if (!cancelled) {
        await refreshMembershipStatus(token, { force: true })
      }
    }

    void sync()
    return () => {
      cancelled = true
    }
  }, [])

  return null
}
