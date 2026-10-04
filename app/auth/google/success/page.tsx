'use client'

import { Suspense, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { POST_OAUTH_RETURN_SESSION_KEY } from '@/lib/config'
import { persistAuthSession } from '@/lib/authSession'

function safeInternalPath(raw: string | null): string {
  if (!raw) return '/'
  let decoded = raw
  try {
    decoded = decodeURIComponent(raw)
  } catch {
    decoded = raw
  }
  if (decoded.startsWith('/') && !decoded.startsWith('//')) return decoded
  return '/'
}

function GoogleSuccessInner() {
  const searchParams = useSearchParams()
  const router = useRouter()

  useEffect(() => {
    const token = searchParams.get('token')
    const customer = searchParams.get('customer')
    if (token) {
      let customerData: Record<string, unknown> = {}
      if (customer) {
        try {
          customerData = JSON.parse(decodeURIComponent(customer)) as Record<string, unknown>
        } catch {
          customerData = {}
        }
      }
      persistAuthSession(decodeURIComponent(token), customerData)
    }
    let next = '/'
    if (typeof window !== 'undefined') {
      const stored = sessionStorage.getItem(POST_OAUTH_RETURN_SESSION_KEY)
      next = safeInternalPath(stored)
      sessionStorage.removeItem(POST_OAUTH_RETURN_SESSION_KEY)
    }
    router.replace(next)
  }, [searchParams, router])

  return null
}

export default function GoogleSuccessPage() {
  return (
    <Suspense>
      <GoogleSuccessInner />
    </Suspense>
  )
}
