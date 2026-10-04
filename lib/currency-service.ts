'use client'

import { useEffect, useMemo, useState, useSyncExternalStore } from 'react'
import { DEFAULT_CURRENCY, SUPPORTED_CURRENCIES, type SupportedCurrency } from '@/lib/currency'

type RatesPayload = {
  rates?: Record<string, number>
}

const CURRENCY_STORAGE_KEY = 'currency'
const CURRENCY_RATES_STORAGE_KEY = 'currency_rates'
const CURRENCY_RATES_TS_STORAGE_KEY = 'currency_rates_updated_at'
const RATES_TTL_MS = 1000 * 60 * 60 * 12
const AED_PRICE_PATTERN = /AED\s*([0-9,]+(?:\.\d{2})?)/g

let ratesCache: Record<string, number> | null = null
let ratesLoadedAt = 0

function inBrowser(): boolean {
  return typeof window !== 'undefined'
}

export function getCurrencyConfig(code: string): SupportedCurrency {
  return SUPPORTED_CURRENCIES.find((item) => item.code === code) ?? SUPPORTED_CURRENCIES[0]
}

export function getSelectedCurrency(): SupportedCurrency['code'] {
  if (!inBrowser()) return DEFAULT_CURRENCY
  const value = localStorage.getItem(CURRENCY_STORAGE_KEY)
  const found = SUPPORTED_CURRENCIES.find((entry) => entry.code === value)
  return found?.code ?? DEFAULT_CURRENCY
}

export function setSelectedCurrency(code: SupportedCurrency['code']): void {
  if (!inBrowser()) return
  localStorage.setItem(CURRENCY_STORAGE_KEY, code)
}

export function getSelectedCurrencyServerSnapshot(): SupportedCurrency['code'] {
  return DEFAULT_CURRENCY
}

export function subscribeSelectedCurrency(onStoreChange: () => void): () => void {
  if (!inBrowser()) return () => {}
  const onStorage = (event: StorageEvent) => {
    if (event.key === CURRENCY_STORAGE_KEY || event.key === null) onStoreChange()
  }
  window.addEventListener('storage', onStorage)
  return () => window.removeEventListener('storage', onStorage)
}

function readRatesFromStorage(): void {
  if (!inBrowser()) return
  if (ratesCache) return
  const rawRates = localStorage.getItem(CURRENCY_RATES_STORAGE_KEY)
  const rawTs = localStorage.getItem(CURRENCY_RATES_TS_STORAGE_KEY)
  if (!rawRates || !rawTs) return
  try {
    const parsed = JSON.parse(rawRates) as Record<string, number>
    ratesCache = parsed
    ratesLoadedAt = Number(rawTs) || 0
  } catch {
    ratesCache = null
    ratesLoadedAt = 0
  }
}

export function setRates(payload: RatesPayload): void {
  const rates = payload.rates ?? {}
  ratesCache = rates
  ratesLoadedAt = Date.now()
  if (!inBrowser()) return
  localStorage.setItem(CURRENCY_RATES_STORAGE_KEY, JSON.stringify(rates))
  localStorage.setItem(CURRENCY_RATES_TS_STORAGE_KEY, String(ratesLoadedAt))
}

export async function fetchRates(base: SupportedCurrency['code'] = 'AED'): Promise<RatesPayload | null> {
  const response = await fetch(`https://open.er-api.com/v6/latest/${base}`)
  if (!response.ok) return null
  return (await response.json()) as RatesPayload
}

export async function ensureRatesFresh(): Promise<void> {
  readRatesFromStorage()
  const isFresh = ratesCache && Date.now() - ratesLoadedAt < RATES_TTL_MS
  if (isFresh) return
  try {
    const payload = await fetchRates('AED')
    if (payload?.rates) setRates(payload)
  } catch {
    // Keep existing cached rates or AED fallback behavior.
  }
}

export function convertFromAED(amount: number, currencyCode?: string): number {
  const safeAmount = Number.isFinite(amount) ? amount : 0
  const code = currencyCode ?? getSelectedCurrency()
  if (code === 'AED') return safeAmount
  readRatesFromStorage()
  const rate = ratesCache?.[code]
  if (!rate || !Number.isFinite(rate)) return safeAmount
  return safeAmount * rate
}

export function convertToAED(amount: number, currencyCode?: string): number {
  const safeAmount = Number.isFinite(amount) ? amount : 0
  const code = currencyCode ?? getSelectedCurrency()
  if (code === 'AED') return safeAmount
  readRatesFromStorage()
  const rate = ratesCache?.[code]
  if (!rate || !Number.isFinite(rate)) return safeAmount
  return safeAmount / rate
}

export function formatPriceAmount(amount: number, fractionDigits = 0): string {
  const safeAmount = Number.isFinite(amount) ? amount : 0
  return safeAmount.toLocaleString(undefined, {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits
  })
}

export function formatPrice(amount: number, currencyCode?: string, fractionDigits = 0): string {
  const code = currencyCode ?? getSelectedCurrency()
  const formattedAmount = formatPriceAmount(amount, fractionDigits)
  const { symbol } = getCurrencyConfig(code)
  switch (code) {
    case 'AED':
      return `${symbol} ${formattedAmount}`
    case 'USD':
    case 'EUR':
    case 'GBP':
      return `${symbol}${formattedAmount}`
    default:
      return `${code} ${formattedAmount}`
  }
}

export function formatPriceFromAED(amount: number, currencyCode?: string, fractionDigits = 0): string {
  const code = currencyCode ?? getSelectedCurrency()
  return formatPrice(convertFromAED(amount, code), code, fractionDigits)
}

/** Formatted amount with currency symbol (د.إ, €, $, £) — used on lease/search cards. */
export function formatPriceWithCode(amount: number, currencyCode?: string): string {
  return formatPrice(amount, currencyCode)
}

export function convertPricesInText(text: string, currencyCode?: string): string {
  if (!text || typeof text !== 'string') return text
  const code = currencyCode ?? getSelectedCurrency()
  if (code === 'AED') return text
  return text.replace(AED_PRICE_PATTERN, (_match, pricePart: string) => {
    const cleanPrice = Number(pricePart.replace(/,/g, ''))
    return formatPrice(convertFromAED(cleanPrice, code), code)
  })
}

export function useCurrencyService() {
  const currency = useSyncExternalStore(
    subscribeSelectedCurrency,
    getSelectedCurrency,
    getSelectedCurrencyServerSnapshot
  )
  const [ratesReady, setRatesReady] = useState(false)

  useEffect(() => {
    void ensureRatesFresh().finally(() => setRatesReady(true))
  }, [])

  const api = useMemo(
    () => ({
      currency,
      ratesReady,
      convertFromAED: (value: number) => convertFromAED(value, currency),
      convertToAED: (value: number) => convertToAED(value, currency),
      formatPrice: (value: number) => formatPrice(value, currency),
      formatPriceFromAED: (value: number) => formatPriceFromAED(value, currency),
      formatPriceWithCode: (value: number) => formatPriceWithCode(value, currency),
      convertPricesInText: (value: string) => convertPricesInText(value, currency)
    }),
    [currency, ratesReady]
  )

  return api
}
