/**
 * Shared field validators for registration / onboarding / business-profile forms.
 * Each `getXValidationError` returns an error message, or `undefined` when valid.
 */

export const NAME_REGEX = /^[A-Za-z][A-Za-z\s'.-]{1,49}$/
export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/
export const PHONE_REGEX = /^\+?[0-9]{7,15}$/
export const COUNTRY_REGEX = /^[A-Za-z\s'.-]{2,56}$/
export const COMPANY_NAME_REGEX = /^[A-Za-z0-9][A-Za-z0-9\s&.,'-]{1,99}$/
/** UAE trade licenses vary by emirate (e.g. "123456", "CN-1234567") — alphanumeric with separators. */
export const TRADE_LICENSE_REGEX = /^[A-Za-z0-9][A-Za-z0-9\-/]{2,23}$/
/** UAE FTA Tax Registration Number (TRN) is always exactly 15 digits. */
export const VAT_NUMBER_REGEX = /^\d{15}$/
export const COMPANY_WEBSITE_REGEX = /^(https?:\/\/)?([\da-z-]+\.)+[a-z]{2,}(\/[\w#!:.?+=&%@\-/]*)?$/i
export const COMPANY_ADDRESS_MIN_LENGTH = 5
export const COMPANY_ADDRESS_MAX_LENGTH = 200

function stripPhoneFormatting(value: string): string {
  return value.replace(/[\s()-]/g, '')
}

export function getNameValidationError(value: string, fieldLabel: string): string | undefined {
  const trimmed = value.trim()
  if (!trimmed) return `${fieldLabel} is required`
  if (!NAME_REGEX.test(trimmed)) {
    return `${fieldLabel} must be 2-50 letters and may include spaces, apostrophes, or hyphens`
  }
  return undefined
}

export function getEmailValidationError(value: string): string | undefined {
  const trimmed = value.trim()
  if (!trimmed) return 'Email is required'
  if (!EMAIL_REGEX.test(trimmed)) return 'Please enter a valid email address'
  return undefined
}

export function getPhoneValidationError(value: string, fieldLabel = 'Phone number'): string | undefined {
  const trimmed = stripPhoneFormatting(value.trim())
  if (!trimmed) return `${fieldLabel} is required`
  if (!PHONE_REGEX.test(trimmed)) {
    return `${fieldLabel} must be 7-15 digits, optionally starting with +`
  }
  return undefined
}

export function getCountryValidationError(value: string): string | undefined {
  const trimmed = value.trim()
  if (!trimmed) return 'Country is required'
  if (!COUNTRY_REGEX.test(trimmed)) return 'Country must contain only letters'
  return undefined
}

export function getCompanyNameValidationError(value: string): string | undefined {
  const trimmed = value.trim()
  if (!trimmed) return 'Company name is required'
  if (trimmed.length < 2) return 'Company name must be at least 2 characters'
  if (!COMPANY_NAME_REGEX.test(trimmed)) {
    return 'Company name contains invalid characters'
  }
  return undefined
}

export function getTradeLicenseNumberValidationError(value: string): string | undefined {
  const trimmed = value.trim()
  if (!trimmed) return 'Trade license number is required'
  if (!TRADE_LICENSE_REGEX.test(trimmed)) {
    return 'Trade license number must be 4-24 alphanumeric characters (hyphens/slashes allowed)'
  }
  return undefined
}

export function getVatNumberValidationError(value: string): string | undefined {
  const trimmed = value.trim()
  if (!trimmed) return 'VAT number is required'
  if (!VAT_NUMBER_REGEX.test(trimmed)) {
    return 'VAT number must be exactly 15 digits (UAE TRN format)'
  }
  return undefined
}

/** Company website is optional — only validates format when a value is present. */
export function getCompanyWebsiteValidationError(value: string): string | undefined {
  const trimmed = value.trim()
  if (!trimmed) return undefined
  if (!COMPANY_WEBSITE_REGEX.test(trimmed)) return 'Please enter a valid website URL'
  return undefined
}

export function getCompanyAddressValidationError(value: string): string | undefined {
  const trimmed = value.trim()
  if (!trimmed) return 'Company address is required'
  if (trimmed.length < COMPANY_ADDRESS_MIN_LENGTH) {
    return `Company address must be at least ${COMPANY_ADDRESS_MIN_LENGTH} characters`
  }
  if (trimmed.length > COMPANY_ADDRESS_MAX_LENGTH) {
    return `Company address must be under ${COMPANY_ADDRESS_MAX_LENGTH} characters`
  }
  return undefined
}

export function getContactPersonValidationError(value: string): string | undefined {
  return getNameValidationError(value, 'Contact person')
}
