import type { Metadata } from 'next'
import { MembershipPaymentFailure } from '@/components/membership/MembershipPaymentResult'

export const metadata: Metadata = {
  title: 'Membership Payment Unsuccessful | Ghost Rentals',
  description: 'Your Ghost Rentals membership payment could not be completed.',
  robots: { index: false, follow: false }
}

type SearchParams = Promise<Record<string, string | string[] | undefined>>

function firstParam(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0]
  return value
}

/**
 * MamoPay / backend failure (or cancel) redirect target.
 * Configure on the BE as: `{SITE_URL}/membership/failure`
 *
 * Optional query params the backend may append:
 * - message
 */
export default async function MembershipPaymentFailurePage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams
  return <MembershipPaymentFailure message={firstParam(params.message)} />
}
