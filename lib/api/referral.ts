import { apiPost, type ApiResponse } from '@/lib/api/client'

export type ReferralReferrer = {
  firstname?: string
  lastname?: string
}

export type ValidateReferralResult = {
  referral_code?: string
  referrer?: ReferralReferrer
}

export type ReferralRewards = {
  referrer_points?: number
  referee_points?: number
}

export type ReferralStats = {
  total_referrals?: number
  rewarded?: number
  pending?: number
  points_earned?: number
}

export type ReferralListItem = {
  _id?: string
  referee_name?: string
  status?: string
  points_awarded?: number
  createdAt?: string
  [key: string]: unknown
}

export type MyReferralResult = {
  referral_code?: string | null
  referred_by_customer_id?: string | null
  rewards?: ReferralRewards
  stats?: ReferralStats
  referrals?: ReferralListItem[]
}

export type EnsureReferralCodeResult = {
  referral_code?: string
}

/**
 * Public — validate a referral code on the signup screen.
 * POST /api/membership/referral/validate
 */
export async function validateReferralCode(
  referralCode: string,
): Promise<ApiResponse<ValidateReferralResult>> {
  return apiPost<ValidateReferralResult>('/api/membership/referral/validate', {
    referral_code: referralCode.trim().toUpperCase(),
  })
}

/**
 * Logged-in — get my referral code + stats (JWT).
 * POST /api/membership/referral/my-auth
 */
export async function getMyReferral(token: string): Promise<ApiResponse<MyReferralResult>> {
  return apiPost<MyReferralResult>('/api/membership/referral/my-auth', {}, { token })
}

/**
 * Logged-in — apply a referral code once (JWT).
 * POST /api/membership/referral/apply-auth
 */
export async function applyReferralCode(
  referralCode: string,
  token: string,
): Promise<ApiResponse<MyReferralResult | Record<string, unknown>>> {
  return apiPost('/api/membership/referral/apply-auth', {
    referral_code: referralCode.trim().toUpperCase(),
  }, { token })
}

/**
 * Logged-in — ensure / generate my referral code.
 * POST /api/membership/referral/ensure-code (body token; also sends Bearer).
 */
export async function ensureReferralCode(
  token: string,
): Promise<ApiResponse<EnsureReferralCodeResult>> {
  return apiPost<EnsureReferralCodeResult>(
    '/api/membership/referral/ensure-code',
    { token },
    { token },
  )
}
