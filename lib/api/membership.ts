import { ApiError, apiPost, type ApiResponse } from './client'

/** Structured benefits mirror `BenefitsSchema` on the backend MembershipPackage. */
export type RawMembershipBenefits = {
  free_car_wash_per_period?: number
  extra_mileage_km?: number
  free_pick_drop?: boolean
  free_salik?: boolean
  birthday_rental_days?: number
  free_tinting?: boolean
}

export type MembershipBillingInterval = 'monthly' | 'yearly'

/** Shape returned by `POST /api/membership/packages` (public catalog). */
export type RawMembershipPackage = {
  _id: string
  name: string
  slug: string
  tier: string
  billing_interval: MembershipBillingInterval
  price_aed: number
  signup_points?: number
  rental_discount_percent?: number
  points_multiplier?: number
  benefits?: RawMembershipBenefits
  description?: string
  sort_order?: number
  status?: boolean
}

export type SubscribeResult = {
  subscription_id: string
  payment_url: string
  simulated?: boolean
}

/**
 * Frontend return URLs for MamoPay redirects after checkout.
 * Backend should set these when creating the payment link:
 *   success → `{SITE_URL}/membership/success`
 *   failure → `{SITE_URL}/membership/failure`
 */
export const MEMBERSHIP_PAYMENT_SUCCESS_PATH = '/membership/success'
export const MEMBERSHIP_PAYMENT_FAILURE_PATH = '/membership/failure'

/** Public membership catalog for the website. */
export const getPublicMembershipPackages = () => apiPost<RawMembershipPackage[]>('/api/membership/packages', {})

/** Shape returned by `POST /api/membership/settings` (public loyalty settings). */
export type RawLoyaltySettings = {
  point_value_aed?: number
  spend_per_point_aed?: number
  non_member_points_multiplier?: number
  referral_referrer_points?: number
  referral_referee_points?: number
}

/** Public loyalty program settings. */
export const getLoyaltySettings = () => apiPost<RawLoyaltySettings>('/api/membership/settings', {})

export type LoyaltySettings = {
  pointValueAed: number
  spendPerPointAed: number
  nonMemberPointsMultiplier: number
  referralReferrerPoints: number
  referralRefereePoints: number
}

export function toLoyaltySettings(raw: RawLoyaltySettings | null | undefined): LoyaltySettings {
  return {
    pointValueAed: num(raw?.point_value_aed, 0.5),
    spendPerPointAed: num(raw?.spend_per_point_aed, 10),
    nonMemberPointsMultiplier: num(raw?.non_member_points_multiplier, 1),
    referralReferrerPoints: num(raw?.referral_referrer_points, 0),
    referralRefereePoints: num(raw?.referral_referee_points, 0)
  }
}

function isSubscribeSuccess(res: ApiResponse<SubscribeResult> | null): res is ApiResponse<SubscribeResult> {
  return res != null && res.code === 200 && Boolean(res.result?.payment_url)
}

/**
 * Start a membership checkout — backend creates the MamoPay payment link and
 * returns the hosted-checkout `payment_url`.
 *
 * The customer is identified three ways for backend compatibility (some legacy
 * routes read `token`/`customer_id` from the body instead of the Bearer header):
 * Bearer JWT + body `token` + body `customer_id`. If `/subscribe` can't resolve
 * the customer, the JWT `-auth` route (same convention as referral my-auth) is
 * tried as a fallback.
 */
export async function subscribeMembership(
  packageId: string,
  token: string,
  customerId?: string
): Promise<ApiResponse<SubscribeResult>> {
  const payload = {
    package_id: packageId,
    token,
    ...(customerId ? { customer_id: customerId } : {})
  }

  let primary: ApiResponse<SubscribeResult> | null = null
  let primaryError: unknown = null
  try {
    primary = await apiPost<SubscribeResult>('/api/membership/subscribe', payload, { token })
    if (isSubscribeSuccess(primary)) return primary
  } catch (error) {
    primaryError = error
  }

  try {
    const fallback = await apiPost<SubscribeResult>('/api/membership/subscribe-auth', payload, { token })
    if (isSubscribeSuccess(fallback)) return fallback
  } catch {
    // Fallback route unavailable — surface the primary outcome below.
  }

  if (primary) return primary
  if (primaryError instanceof ApiError) throw primaryError
  throw primaryError ?? new ApiError('Unable to start checkout.', 500, '/api/membership/subscribe')
}

/**
 * Raw "my membership" payload from POST /api/membership/my-auth.
 * Real shape:
 *   result.subscription.package_id = populated package object
 *   result.points = { balance, aed_value, point_value_aed, … }
 */
export type RawMyMembershipPackage = Partial<RawMembershipPackage> & {
  _id?: string
  name?: string
  tier?: string
  billing_interval?: MembershipBillingInterval | string
  rental_discount_percent?: number
  signup_points?: number
  points_multiplier?: number
  price_aed?: number
}

export type RawMyMembershipPoints = {
  balance?: number
  total_earned?: number
  total_redeemed?: number
  point_value_aed?: number
  aed_value?: number
}

export type RawMyMembershipSubscription = {
  _id?: string
  status?: string
  active?: boolean
  tier?: string
  billing_interval?: string
  price_aed?: number
  package?: RawMyMembershipPackage | null
  package_id?: RawMyMembershipPackage | string | null
  package_name?: string
  plan_name?: string
  name?: string
  current_period_end?: string
  expires_at?: string
  renewal_date?: string
  end_date?: string
  next_billing_date?: string
  [key: string]: unknown
}

export type RawMyMembership = {
  subscription?: RawMyMembershipSubscription | null
  membership?: RawMyMembershipSubscription | null
  points?: number | RawMyMembershipPoints | null
  points_balance?: number
  loyalty_points?: number
  /** Flat fallback when BE returns the subscription at the top level. */
  status?: string
  active?: boolean
  package?: RawMyMembershipPackage | null
  package_id?: RawMyMembershipPackage | string | null
  package_name?: string
  plan_name?: string
  name?: string
  tier?: string
  billing_interval?: string
  current_period_end?: string
  expires_at?: string
  renewal_date?: string
  end_date?: string
  next_billing_date?: string
  [key: string]: unknown
}

/**
 * Logged-in — current customer's membership subscription + loyalty points.
 * POST /api/membership/my-auth (JWT route, same naming as referral my-auth).
 */
export const getMyMembership = (token: string) => apiPost<RawMyMembership>('/api/membership/my-auth', {}, { token })

/** Normalized membership status used by the header badge and profile page. */
export type MyMembershipStatus = {
  isMember: boolean
  planName: string
  tier: string
  status: string
  billingInterval: string
  /** Loyalty points balance. */
  points: number
  /** Cash value of the points balance in AED (from `points.aed_value`). */
  pointsAedValue: number
  /** Rental discount % from the subscribed package. */
  rentalDiscountPercent: number
  renewsAt: string | null
}

const ACTIVE_MEMBERSHIP_STATUSES = new Set(['active', 'trialing', 'paid', 'subscribed'])

function asPackage(value: unknown): RawMyMembershipPackage | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  return value as RawMyMembershipPackage
}

function stripBillingFromPlanTitle(title: string): string {
  return title.replace(/\s*(monthly|yearly)\s*$/i, '').trim()
}

function readPoints(raw: RawMyMembership): { balance: number; aedValue: number } {
  if (raw.points && typeof raw.points === 'object' && !Array.isArray(raw.points)) {
    return {
      balance: num(raw.points.balance, 0),
      aedValue: num(raw.points.aed_value, 0)
    }
  }
  return {
    balance: num(raw.points_balance ?? raw.loyalty_points ?? (typeof raw.points === 'number' ? raw.points : 0), 0),
    aedValue: 0
  }
}

export function toMyMembershipStatus(raw: RawMyMembership | null | undefined): MyMembershipStatus {
  const empty: MyMembershipStatus = {
    isMember: false,
    planName: '',
    tier: '',
    status: '',
    billingInterval: '',
    points: 0,
    pointsAedValue: 0,
    rentalDiscountPercent: 0,
    renewsAt: null
  }
  if (!raw || typeof raw !== 'object') return empty

  const { balance, aedValue } = readPoints(raw)
  const sub = (raw.subscription ?? raw.membership ?? raw) as RawMyMembershipSubscription
  const pkg = asPackage(sub.package_id) ?? asPackage(sub.package) ?? asPackage(raw.package_id) ?? asPackage(raw.package)

  const rawPlanName = String(pkg?.name ?? sub.package_name ?? sub.plan_name ?? sub.name ?? '').trim()
  const planName = stripBillingFromPlanTitle(rawPlanName) || String(sub.tier ?? pkg?.tier ?? '').trim()
  const tier = String(sub.tier ?? pkg?.tier ?? '').trim()
  const status = String(sub.status ?? '').trim().toLowerCase()
  const billingInterval = String(sub.billing_interval ?? pkg?.billing_interval ?? '').trim().toLowerCase()
  const renewsAt =
    String(sub.next_billing_date ?? sub.end_date ?? sub.current_period_end ?? sub.expires_at ?? sub.renewal_date ?? '').trim() || null
  const rentalDiscountPercent = num(pkg?.rental_discount_percent, 0)

  const isMember = sub.active === true || ACTIVE_MEMBERSHIP_STATUSES.has(status) || Boolean(planName && pkg)

  return {
    isMember,
    planName,
    tier,
    status,
    billingInterval,
    points: balance,
    pointsAedValue: aedValue,
    rentalDiscountPercent,
    renewsAt
  }
}

/** Normalized plan used by the membership UI. */
export type MembershipPlan = {
  id: string
  name: string
  slug: string
  tier: string
  billingInterval: MembershipBillingInterval
  priceAed: number
  signupPoints: number
  rentalDiscountPercent: number
  pointsMultiplier: number
  /** e.g. 20 for a 1.2x multiplier. */
  bonusPointsPercent: number
  description: string
  features: string[]
}

function num(value: unknown, fallback = 0): number {
  const parsed = typeof value === 'string' ? Number(value) : (value as number)
  return typeof parsed === 'number' && Number.isFinite(parsed) ? parsed : fallback
}

function buildFeatures(pkg: RawMembershipPackage): string[] {
  const features: string[] = []
  const benefits = pkg.benefits ?? {}
  const signupPoints = num(pkg.signup_points)
  const discount = num(pkg.rental_discount_percent)
  const multiplier = num(pkg.points_multiplier, 1)
  const carWash = num(benefits.free_car_wash_per_period)
  const mileage = num(benefits.extra_mileage_km)
  const birthdayDays = num(benefits.birthday_rental_days)

  if (signupPoints > 0) features.push(`Instant ${signupPoints.toLocaleString('en-AE')} points on joining`)
  if (discount > 0) features.push(`${discount}% off all rentals`)
  if (benefits.free_pick_drop) features.push('Free pick-up & drop-off')
  if (carWash > 0) features.push(carWash === 1 ? '1x free car wash' : `${carWash}x free car wash`)
  if (mileage > 0) features.push(`${mileage.toLocaleString('en-AE')} km additional mileage free`)
  if (benefits.free_tinting) features.push('Free tinting of your choice')
  if (birthdayDays > 0) features.push(`Free ${birthdayDays}-day rental on your birthday`)
  if (benefits.free_salik) features.push('Free Salik')
  if (multiplier > 1) features.push(`Earn ${Math.round((multiplier - 1) * 100)}% more points on every transaction`)

  return features
}

export function toMembershipPlan(pkg: RawMembershipPackage): MembershipPlan {
  const multiplier = num(pkg.points_multiplier, 1)
  return {
    id: String(pkg._id),
    name: pkg.name,
    slug: pkg.slug,
    tier: pkg.tier,
    billingInterval: pkg.billing_interval,
    priceAed: num(pkg.price_aed),
    signupPoints: num(pkg.signup_points),
    rentalDiscountPercent: num(pkg.rental_discount_percent),
    pointsMultiplier: multiplier,
    bonusPointsPercent: Math.round((multiplier - 1) * 100),
    description: pkg.description ?? '',
    features: buildFeatures(pkg)
  }
}

export function toMembershipPlans(packages: RawMembershipPackage[] | null | undefined): MembershipPlan[] {
  if (!Array.isArray(packages)) return []
  return packages
    .filter((pkg) => pkg && pkg.status !== false)
    .map(toMembershipPlan)
    .sort((a, b) => a.priceAed - b.priceAed)
}
