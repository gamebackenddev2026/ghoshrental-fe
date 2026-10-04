'use client'

import { useEffect, useState } from 'react'
import { AUTH_CHANGED_EVENT, getClientAuthToken } from '@/lib/authToken'
import { readStoredCustomer, resolveCustomerDiscountPercent } from '@/lib/customerDiscount'

export function useMemberDiscountPercent(): number | null {
  const [percent, setPercent] = useState<number | null>(null)

  useEffect(() => {
    const sync = () => {
      if (!getClientAuthToken()) {
        setPercent(null)
        return
      }
      setPercent(resolveCustomerDiscountPercent(readStoredCustomer()))
    }

    sync()
    window.addEventListener(AUTH_CHANGED_EVENT, sync)
    window.addEventListener('storage', sync)
    return () => {
      window.removeEventListener(AUTH_CHANGED_EVENT, sync)
      window.removeEventListener('storage', sync)
    }
  }, [])

  return percent
}
