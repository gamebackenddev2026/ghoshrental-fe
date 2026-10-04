'use client'

import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { getWishlist, type WishlistItem } from '@/lib/api/auth'
import { AUTH_CHANGED_EVENT, AUTH_TOKEN_KEY } from '@/lib/authToken'

type WishlistContextValue = {
  /** null = logged out or not loaded yet; Set = fetched vehicle ids */
  ids: Set<string> | null
  isWishlisted: (id: string | undefined) => boolean
  add: (id: string) => void
  remove: (id: string) => void
  refreshWishlist: () => Promise<void>
}

const WishlistContext = createContext<WishlistContextValue>({
  ids: null,
  isWishlisted: () => false,
  add: () => {},
  remove: () => {},
  refreshWishlist: async () => {},
})

export function useWishlist() {
  return useContext(WishlistContext)
}

function extractWishlistVehicleId(item: WishlistItem): string {
  const direct = item.vehicle_id ?? item._id ?? ''
  if (direct) return String(direct)
  const nested = item.vehicle_data?.[0] as { _id?: string } | undefined
  return nested?._id ? String(nested._id) : ''
}

export function WishlistProvider({ children }: { children: React.ReactNode }) {
  const [ids, setIds] = useState<Set<string> | null>(null)

  const fetchWishlist = useCallback(async (token: string) => {
    try {
      const response = await getWishlist(token)
      const list = Array.isArray(response.result) ? response.result : []
      setIds(new Set(list.map(extractWishlistVehicleId).filter(Boolean)))
    } catch {
      setIds(new Set())
    }
  }, [])

  const refreshWishlist = useCallback(async () => {
    const token = localStorage.getItem(AUTH_TOKEN_KEY) ?? ''
    if (!token) {
      setIds(null)
      return
    }
    await fetchWishlist(token)
  }, [fetchWishlist])

  useEffect(() => {
    const sync = () => {
      const token = localStorage.getItem(AUTH_TOKEN_KEY) ?? ''
      if (token) {
        void fetchWishlist(token)
      } else {
        setIds(null)
      }
    }

    sync()
    window.addEventListener('storage', sync)
    window.addEventListener(AUTH_CHANGED_EVENT, sync)
    return () => {
      window.removeEventListener('storage', sync)
      window.removeEventListener(AUTH_CHANGED_EVENT, sync)
    }
  }, [fetchWishlist])

  const isWishlisted = useCallback(
    (id: string | undefined) => Boolean(id && ids?.has(id)),
    [ids],
  )

  const add = useCallback((id: string) => {
    setIds((prev) => {
      const next = new Set(prev ?? [])
      next.add(id)
      return next
    })
  }, [])

  const remove = useCallback((id: string) => {
    setIds((prev) => {
      if (!prev) return prev
      const next = new Set(prev)
      next.delete(id)
      return next
    })
  }, [])

  return (
    <WishlistContext.Provider value={{ ids, isWishlisted, add, remove, refreshWishlist }}>
      {children}
    </WishlistContext.Provider>
  )
}
