export const PASSWORD_REQUIREMENTS_MESSAGE =
  'Use at least 8 characters with uppercase, lowercase, number, and special character.'

export function isStrongPassword(value: string): boolean {
  if (value.length < 8) return false
  const hasLower = /[a-z]/.test(value)
  const hasUpper = /[A-Z]/.test(value)
  const hasDigit = /\d/.test(value)
  const hasSpecial = /[^A-Za-z0-9]/.test(value)
  return hasLower && hasUpper && hasDigit && hasSpecial
}

export function getPasswordValidationError(value: string): string | undefined {
  if (!value.trim()) return 'Password is required'
  if (!isStrongPassword(value)) return PASSWORD_REQUIREMENTS_MESSAGE
  return undefined
}
