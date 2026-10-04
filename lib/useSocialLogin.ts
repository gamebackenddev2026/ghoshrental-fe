'use client'

import { getAppleOAuthStartUrl, getGoogleOAuthStartUrl, POST_OAUTH_RETURN_SESSION_KEY } from '@/lib/config'
import { useRef, useState } from 'react'

export function useSocialLogin(returnUrl: string = '/') {
  const [socialLoading, setSocialLoading] = useState<'google' | 'apple' | null>(null)
  const [appleReady] = useState(true)
  const [socialError, setSocialError] = useState('')
  const loginInProgress = useRef(false)

  /** Backend Passport Google OAuth — full-page redirect to API (302 → Google consent). */
  const handleGoogleLogin = () => {
    if (socialLoading || loginInProgress.current) return
    loginInProgress.current = true
    setSocialLoading('google')
    setSocialError('')
    try {
      if (typeof window !== 'undefined') {
        sessionStorage.setItem(POST_OAUTH_RETURN_SESSION_KEY, returnUrl)
      }
      window.location.href = getGoogleOAuthStartUrl()
    } catch {
      loginInProgress.current = false
      setSocialLoading(null)
      setSocialError('Unable to start Google sign-in. Please try again.')
    }
  }

  /** Backend Passport Apple OAuth — full-page redirect to API (302 → Apple auth). */
  const handleAppleLogin = () => {
    if (socialLoading || loginInProgress.current) return
    loginInProgress.current = true
    setSocialLoading('apple')
    setSocialError('')
    try {
      if (typeof window !== 'undefined') {
        sessionStorage.setItem(POST_OAUTH_RETURN_SESSION_KEY, returnUrl)
      }
      window.location.href = getAppleOAuthStartUrl()
    } catch {
      loginInProgress.current = false
      setSocialLoading(null)
      setSocialError('Unable to start Apple sign-in. Please try again.')
    }
  }

  return { handleGoogleLogin, handleAppleLogin, socialLoading, appleReady, socialError, setSocialError }
}
