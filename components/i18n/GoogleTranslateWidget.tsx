'use client'

import { useEffect, useMemo } from 'react'
import {
  SUPPORTED_GOOGLE_TRANSLATE_LANGS,
  type GoogleTranslateLang,
} from '@/lib/i18n/googleTranslate'

declare global {
  interface Window {
    google?: any
    googleTranslateElementInit?: () => void
  }
}

export type { GoogleTranslateLang }
export { SUPPORTED_GOOGLE_TRANSLATE_LANGS }

function readCookie(name: string): string {
  if (typeof document === 'undefined') return ''
  const match = document.cookie.match(new RegExp(`(?:^|; )${name.replace(/[$()*+./?[\\\]^{|}-]/g, '\\$&')}=([^;]*)`))
  return match ? decodeURIComponent(match[1] ?? '') : ''
}

export function currentGoogleTranslateLang(): string {
  const value = readCookie('googtrans')
  const parts = value.split('/').filter(Boolean)
  return parts[1] ?? ''
}

export function applyDirForLang(lang: string) {
  const dir = lang === 'ar' ? 'rtl' : 'ltr'
  document.documentElement.setAttribute('dir', dir)
  document.documentElement.setAttribute('lang', lang || 'en')
}

function setCookie(name: string, value: string) {
  const encoded = encodeURIComponent(value)
  document.cookie = `${name}=${encoded}; path=/; SameSite=Lax`
  const hostParts = window.location.hostname.split('.')
  if (hostParts.length >= 2) {
    const root = `.${hostParts.slice(-2).join('.')}`
    document.cookie = `${name}=${encoded}; path=/; domain=${root}; SameSite=Lax`
  }
}

function clearGoogtransCookie() {
  const expires = 'Thu, 01 Jan 1970 00:00:00 GMT'
  document.cookie = `googtrans=; path=/; expires=${expires}`
  const hostParts = window.location.hostname.split('.')
  if (hostParts.length >= 2) {
    const root = `.${hostParts.slice(-2).join('.')}`
    document.cookie = `googtrans=; path=/; domain=${root}; expires=${expires}`
  }
}

/**
 * Always reload after changing language. In-place translation mutates React-owned
 * DOM and causes removeChild NotFoundError on the next render.
 */
export function forceGoogleTranslateLanguage(lang: string) {
  try {
    if (!lang || lang === 'en') {
      clearGoogtransCookie()
    } else {
      setCookie('googtrans', `/en/${lang}`)
    }
  } catch {
    // ignore
  }
  applyDirForLang(lang || 'en')
  window.location.reload()
}

export function GoogleTranslateWidget() {
  const included = useMemo(() => SUPPORTED_GOOGLE_TRANSLATE_LANGS.join(','), [])

  useEffect(() => {
    let mount = document.getElementById('google_translate_element')
    if (!mount) {
      mount = document.createElement('div')
      mount.id = 'google_translate_element'
      mount.style.position = 'absolute'
      mount.style.width = '1px'
      mount.style.height = '1px'
      mount.style.opacity = '0'
      mount.style.pointerEvents = 'none'
      mount.style.overflow = 'hidden'
      document.body.appendChild(mount)
    }

    window.googleTranslateElementInit = () => {
      try {
        // eslint-disable-next-line no-new
        new window.google.translate.TranslateElement(
          {
            pageLanguage: 'en',
            includedLanguages: included,
            autoDisplay: false,
          },
          'google_translate_element',
        )
      } catch {
        // ignore
      }
    }

    const existing = document.querySelector<HTMLScriptElement>('script[data-google-translate="true"]')
    if (!existing) {
      const script = document.createElement('script')
      script.src = '//translate.google.com/translate_a/element.js?cb=googleTranslateElementInit'
      script.async = true
      script.defer = true
      script.dataset.googleTranslate = 'true'
      document.head.appendChild(script)
    } else if (window.google?.translate?.TranslateElement && typeof window.googleTranslateElementInit === 'function') {
      window.googleTranslateElementInit()
    }

    const lang = currentGoogleTranslateLang() || 'en'
    applyDirForLang(lang)
  }, [included])

  return null
}
