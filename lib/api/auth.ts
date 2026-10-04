import { apiPost, type ApiResponse } from "@/lib/api/client"
import type { RawRecord } from "@/lib/api/types"

export type LoginCustomerPayload = {
  username: string
  password: string
}

export type LoginCustomerResult = RawRecord & {
  _id?: string
  email?: string
  firstname?: string
  lastname?: string
  account_type?: 'b2b' | 'b2c'
  discount_percent?: number | string
}

export type LoginCustomerResponse = ApiResponse<LoginCustomerResult> & {
  token?: string
  /** True only on the response from a brand-new Google/Apple signup (see googleOrAppleLoginRegister). */
  isNewUser?: boolean
}

/**
 * Angular parity: LoginService.validateLogin() -> POST /api/customer/login.
 */
export async function loginCustomer(
  payload: LoginCustomerPayload,
): Promise<LoginCustomerResponse> {
  const response = await apiPost<LoginCustomerResult>("/api/customer/login", payload)
  return response as LoginCustomerResponse
}

export type RegisterCustomerPayload = {
  username: string
  firstname: string
  lastname: string
  email: string
  password: string
  confirmPassword: string
  account_type: 'b2b' | 'b2c'
  phone?: string
  country?: string
  company_name?: string
  trade_license_number?: string
  vat_number?: string
  company_website?: string
  company_address?: string
  contact_person?: string
  contact_phone?: string
  documents?: Array<{ type: string; file_name: string }>
  /** Optional — invalid codes do not block signup. */
  referral_code?: string
}

export type RegisterCustomerResult = RawRecord & {
  _id?: string
  email?: string
  firstname?: string
  lastname?: string
  account_type?: 'b2b' | 'b2c'
  account_status?: string
  b2b_verification_status?: 'pending' | 'approved' | 'rejected'
}

export type RegisterCustomerResponse = ApiResponse<RegisterCustomerResult> & {
  token?: string
  registration_promo_text?: string
}

export type CustomerPresignedUploadPayload = {
  sFileName: string
  sContentType: string
  document_type?: string
}

export type CustomerPresignedUploadResult = {
  sUrl?: string
  url?: string
  fileName?: string
  s3Key?: string
  sPath?: string
  expiresIn?: number
}

/**
 * POST /api/customer/presignedUploadUrl — presigned S3 upload for registration documents.
 * Backend expects sFileName + sContentType; returns result.sUrl and result.fileName.
 */
export async function getCustomerPresignedUploadUrl(
  payload: CustomerPresignedUploadPayload,
): Promise<ApiResponse<CustomerPresignedUploadResult>> {
  return apiPost<CustomerPresignedUploadResult>('/api/customer/presignedUploadUrl', payload)
}

/**
 * Optional registration copy (promo text, B2B/B2C labels) from backend config.
 */
export async function getCustomerRegistrationMeta(): Promise<
  ApiResponse<{ registration_promo_text?: string }>
> {
  return apiPost<{ registration_promo_text?: string }>('/api/customer/registrationMeta', {})
}

/**
 * Angular parity: LoginService.customerRegistration() -> POST /api/customer/registerCustomer.
 */
export async function registerCustomer(
  payload: RegisterCustomerPayload,
): Promise<RegisterCustomerResponse> {
  const response = await apiPost<RegisterCustomerResult>('/api/customer/registerCustomer', payload)
  return response as RegisterCustomerResponse
}

export type SocialLoginPayload = {
  username: string | null
  email: string | null
  password: string | null
  role: string
  group: string
  firstname?: string
  lastname?: string
}

/**
 * Angular parity: LoginService.socialLoginUseRegistration() -> POST /api/customer/socailloginregister.
 */
export async function socialLoginRegister(
  payload: SocialLoginPayload,
): Promise<LoginCustomerResponse> {
  const response = await apiPost<LoginCustomerResult>("/api/customer/socailloginregister", payload)
  return response as LoginCustomerResponse
}

/**
 * Token-based Google/Apple login (alternative to Passport redirect). Body shape matches Angular
 * `LoginService.googleLoginRegistration()` → POST /api/customer/googleorappleloginregister.
 */
export async function googleOrAppleLoginRegister(
  token: string,
  role: "customer" | "user" = "customer",
  provider?: "google" | "apple",
  referralCode?: string,
): Promise<LoginCustomerResponse> {
  const trimmedReferral = referralCode?.trim()
  const response = await apiPost<LoginCustomerResult>(
    "/api/customer/googleorappleloginregister",
    {
      token,
      role,
      provider,
      ...(trimmedReferral ? { referral_code: trimmedReferral.toUpperCase() } : {}),
    },
  )
  return response as LoginCustomerResponse
}

export type CustomerProfilePayload = {
  customer_id: string
}

export type CustomerProfileResult = RawRecord & {
  _id?: string
  firstname?: string
  lastname?: string
  email?: string
  dob?: string
  birthDate?: string
  phone?: string
  phone_number?: string
  nationality?: string
  address?: string
  image?: string
}

/**
 * Angular parity: LoginService.getLoginCustomerData() -> POST /api/customer/getfrontCustomerData.
 */
export async function getFrontCustomerData(
  payload: CustomerProfilePayload,
  token: string,
): Promise<ApiResponse<CustomerProfileResult>> {
  return apiPost<CustomerProfileResult>("/api/customer/getfrontCustomerData", payload, { token })
}

export type EditProfilePayload = {
  customer_id: string
  firstname: string
  lastname: string
  email: string
  dateofbirth?: string
  mobile?: string
  nationality?: string
  address?: string
}

/**
 * Angular parity: LoginService.editProfiledata() -> POST /api/customer/editProfiledata.
 */
export async function editProfileData(
  payload: EditProfilePayload,
  token: string,
): Promise<ApiResponse<RawRecord>> {
  return apiPost<RawRecord>("/api/customer/editProfiledata", payload, { token })
}

export type UpgradeToBusinessPayload = {
  company_name: string
  country?: string
  trade_license_number?: string
  vat_number?: string
  company_website?: string
  company_address?: string
  contact_person?: string
  contact_phone?: string
  documents: Array<{ type: string; file_name: string }>
}

export type UpgradeToBusinessResult = RawRecord & {
  account_type?: 'b2b' | 'b2c'
  discount_percent?: number | string
  verification_status?: 'pending' | 'approved' | 'rejected'
  company_name?: string
}

export type UpgradeToBusinessResponse = ApiResponse<UpgradeToBusinessResult> & {
  account_type?: 'b2b' | 'b2c'
  discount_percent?: number | string
  verification_status?: 'pending' | 'approved' | 'rejected'
}

/**
 * POST /api/customer/upgradeToBusiness
 * Converts the logged-in customer's own account from B2C to a pending B2B account.
 */
export async function upgradeToBusinessAccount(
  payload: UpgradeToBusinessPayload,
  token: string,
): Promise<UpgradeToBusinessResponse> {
  const response = await apiPost<UpgradeToBusinessResult>(
    '/api/customer/upgradeToBusiness',
    payload,
    { token },
  )
  return response as UpgradeToBusinessResponse
}

export type CompleteB2CRegistrationPayload = {
  firstname: string
  lastname: string
  mobile: string
  country: string
  documents: Array<{ type: string; file_name: string }>
}

export type CompleteB2CRegistrationResult = RawRecord & {
  account_type?: 'b2b' | 'b2c'
  discount_percent?: number | string
  verification_status?: 'pending' | 'approved' | 'rejected'
}

export type CompleteB2CRegistrationResponse = ApiResponse<CompleteB2CRegistrationResult> & {
  account_type?: 'b2b' | 'b2c'
  discount_percent?: number | string
  verification_status?: 'pending' | 'approved' | 'rejected'
}

/**
 * POST /api/customer/completeB2CRegistration
 * Completes onboarding for a logged-in customer (personal info + identity documents) —
 * used after a Google/Apple signup, which only provides email/name.
 */
export async function completeB2CRegistration(
  payload: CompleteB2CRegistrationPayload,
  token: string,
): Promise<CompleteB2CRegistrationResponse> {
  const response = await apiPost<CompleteB2CRegistrationResult>(
    '/api/customer/completeB2CRegistration',
    payload,
    { token },
  )
  return response as CompleteB2CRegistrationResponse
}

export type ChangePasswordPayload = {
  current_password: string
  new_password: string
  confirm_password: string
}

/**
 * POST /api/customer/changePassword
 * Updates the authenticated customer's password.
 */
export async function changePassword(
  payload: ChangePasswordPayload,
  token: string,
): Promise<ApiResponse<RawRecord>> {
  return apiPost<RawRecord>("/api/customer/changePassword", payload, { token })
}

export type ForgotPasswordPayload = {
  email: string
}

/**
 * POST /api/customer/forgotcustomerpasswordlink
 * Sends password reset email to existing customer account.
 */
export async function forgotCustomerPasswordLink(
  payload: ForgotPasswordPayload,
): Promise<ApiResponse<RawRecord>> {
  return apiPost<RawRecord>("/api/customer/forgotcustomerpasswordlink", payload)
}

export type UpdateForgotPasswordPayload = {
  forgotLink: string
  password: string
}

/**
 * POST /api/customer/updateforgotpassword
 * Applies a new password using forgot-link code from the URL path.
 */
export async function updateForgotPassword(
  payload: UpdateForgotPasswordPayload,
): Promise<ApiResponse<RawRecord>> {
  return apiPost<RawRecord>("/api/customer/updateforgotpassword", payload)
}

export type WishlistMediaItem = {
  _id?: string
  src?: string
  s3_url?: string
  url?: string
  alt?: string
  name?: string
  file_type?: string
}

export type WishlistItem = RawRecord & {
  _id?: string
  vehicle_id?: string
  vehicle_name?: string[]
  vehicle_type?: string[]
  vehicle_url_key?: string[]
  transmission?: string[]
  seating_capacity?: (string | number)[]
  dailyRate?: (number | null)[]
  regularRateDaily?: (number | null)[]
  hourlyRate?: (number | null)[]
  regularRateHourly?: (number | null)[]
  hourly_rate?: (number | null)[]
  fuelType?: string[]
  mileage?: (number | null)[]
  guest_capacity?: (string | number)[] | string | number
  year?: (string | number)[] | string | number
  length?: string[] | string | number
  vehicle_data?: Array<{
    year?: string | number
    length?: string | number
    guest_capacity?: string | number
    regularRateHourly?: number | null
    hourlyRate?: number | null
    [key: string]: unknown
  }>
  media_data?: WishlistMediaItem[]
  image_data?: WishlistMediaItem[]
}

export async function getWishlist(token: string): Promise<ApiResponse<WishlistItem[]>> {
  return apiPost<WishlistItem[]>("/api/wishlist/getProductWishlistbyUser", { token })
}

export type ActiveAccountPayload = {
  activeLink: string
}

/**
 * POST /api/customer/activeaccount
 * Verifies the email link token, activates the account, and returns a session
 * token so the user is immediately logged in without a separate sign-in step.
 */
export async function activeAccount(
  payload: ActiveAccountPayload,
): Promise<LoginCustomerResponse> {
  const response = await apiPost<LoginCustomerResult>("/api/customer/activeaccount", payload)
  return response as LoginCustomerResponse
}
