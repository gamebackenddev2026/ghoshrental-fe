export const SUPPORTED_GOOGLE_TRANSLATE_LANGS = ['en', 'ar', 'ru', 'zh-CN', 'fr'] as const

export type GoogleTranslateLang = (typeof SUPPORTED_GOOGLE_TRANSLATE_LANGS)[number]

const LANG_CODE_LABELS: Record<string, string> = {
  en: 'EN',
  ar: 'AR',
  ru: 'RU',
  'zh-CN': 'ZH',
  fr: 'FR',
}

/** Parse target language from a `googtrans` cookie value (e.g. "/en/ar"). */
export function parseGoogleTranslateLang(googtrans: string | undefined | null): string {
  if (!googtrans) return 'en'
  const parts = googtrans.split('/').filter(Boolean)
  return parts[1] ?? 'en'
}

export function googleTranslateLangCode(lang: string): string {
  return LANG_CODE_LABELS[lang] ?? 'EN'
}

export function googleTranslateDir(lang: string): 'ltr' | 'rtl' {
  return lang === 'ar' ? 'rtl' : 'ltr'
}
