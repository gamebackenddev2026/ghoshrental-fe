import type { Metadata } from 'next'
import { MembershipPaymentSuccess } from '@/components/membership/MembershipPaymentResult'
import { MembershipSessionSync } from '@/components/membership/MembershipSessionSync'

export const metadata: Metadata = {
  title: 'Membership Payment Successful | Ghost Rentals',
  description: 'Your Ghost Rentals membership payment was successful.',
  robots: { index: false, follow: false }
}

type SearchParams = Promise<Record<string, string | string[] | undefined>>

function firstParam(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0]
  return value
}

/**
 * MamoPay / backend success redirect target.
 * Configure on the BE as: `{SITE_URL}/membership/success`
 *
 * Optional query params the backend may append:
 * - subscription_id
 * - message
 */
export default async function MembershipPaymentSuccessPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams
  return (
    <>
      <MembershipSessionSync />
      <MembershipPaymentSuccess
        subscriptionId={firstParam(params.subscription_id) ?? firstParam(params.subscriptionId)}
        message={firstParam(params.message)}
      />
    </>
  )
}
