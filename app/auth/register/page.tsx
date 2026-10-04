import type { Metadata } from "next"
import { Suspense } from "react"
import { RegisterPageClient } from "./RegisterPageClient"

export const metadata: Metadata = {
  title: { absolute: "Register | Ghost Rentals" },
  description: "Create your Ghost Rentals account to unlock luxury rentals and personalised services.",
}

export default function RegisterPage() {
  return (
    <Suspense fallback={null}>
      <RegisterPageClient />
    </Suspense>
  )
}

