import type { RawRecord, RawVehicle } from './types'

export type CustomerAccountType = 'b2b' | 'b2c' | 'guest'

export type CustomerPricingRate = {
  original?: number
  discounted?: number
}

export type CustomerPricing = {
  account_type?: CustomerAccountType
  discount_percent?: number
  rates?: Record<string, CustomerPricingRate>
}

const RATE_KEYS = [
  'dailyRate',
  'weeklyRate',
  'monthlyRate',
  'hourlyRate',
  'halfdayRate',
  'regularRateDaily',
  'regularRateHourly',
  'regularRateHalfDay',
] as const

export type VehicleRateKey = (typeof RATE_KEYS)[number]

function asNum(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value)
    if (Number.isFinite(parsed)) return parsed
  }
  return 0
}

function snakeKey(key: string): string {
  return key.replace(/([A-Z])/g, '_$1').toLowerCase()
}

/** Read discounted + original rate from API `customer_pricing` or `original_*` fields. */
export function resolveVehicleRatePair(
  raw: RawVehicle | RawRecord,
  rateKey: VehicleRateKey,
): { current: number; original: number } {
  const pricing = raw.customer_pricing as CustomerPricing | undefined
  const fromPricing = pricing?.rates?.[rateKey]

  const snake = snakeKey(rateKey)
  const directCurrent = asNum(raw[rateKey] ?? raw[snake])
  const originalField = asNum(
    raw[`original_${rateKey}`] ??
      raw[`original_${snake}`] ??
      fromPricing?.original,
  )
  const discountedField = asNum(fromPricing?.discounted ?? directCurrent)

  const current = discountedField || directCurrent

  const originalAliases: Record<string, string[]> = {
    dailyRate: ['original_dailyRate', 'original_daily_rate', 'regularRateDaily', 'regular_rate_daily'],
    weeklyRate: ['original_weeklyRate', 'original_weekly_rate', 'regularRateWeekly', 'regular_rate_weekly'],
    monthlyRate: ['original_monthlyRate', 'original_monthly_rate', 'regularRateMonthly', 'regular_rate_monthly'],
    hourlyRate: ['original_hourlyRate', 'original_hourly_rate', 'regularRateHourly', 'regular_rate_hourly'],
    halfdayRate: ['original_halfdayRate', 'original_halfday_rate', 'regularRateHalfDay', 'regular_rate_half_day'],
  }

  let original = originalField
  if (!original) {
    for (const alias of originalAliases[rateKey] ?? []) {
      const value = asNum(raw[alias])
      if (value > 0) {
        original = value
        break
      }
    }
  }

  if (!original) original = current

  if (original > current) return { current, original }
  return { current, original: current }
}
