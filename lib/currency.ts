export type SupportedCurrency = {
  code: 'AED' | 'EUR' | 'GBP' | 'USD'
  /** Text fallback for plain strings (WhatsApp, etc.). */
  symbol: string
  flag: string
}

export const SUPPORTED_CURRENCIES: SupportedCurrency[] = [
  { code: 'AED', symbol: 'AED', flag: '/assets/flags/ae.svg' },
  { code: 'EUR', symbol: '€', flag: '/assets/flags/eu.svg' },
  { code: 'GBP', symbol: '£', flag: '/assets/flags/gb.svg' },
  { code: 'USD', symbol: '$', flag: '/assets/flags/us.svg' }
]

export const DEFAULT_CURRENCY: SupportedCurrency['code'] = 'AED'
