'use client'

import '@/lib/i18n/patchDomForGoogleTranslate'
import { GoogleTranslateWidget } from '@/components/i18n/GoogleTranslateWidget'

/** Single app-wide mount for Google Translate (kept outside Header re-renders). */
export function GoogleTranslateRoot() {
  return <GoogleTranslateWidget />
}
