import { VerifyEmailPageClient } from '@/components/account/VerifyEmailPageClient'

/** Legacy email links use `/account/active/:token` (Angular parity). */
export default function ActiveAccountPage() {
  return <VerifyEmailPageClient />
}
