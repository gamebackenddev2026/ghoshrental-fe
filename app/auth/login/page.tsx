import type { Metadata } from "next"
import { Suspense } from "react"
import { LoginPageClient } from "./LoginPageClient"

export const metadata: Metadata = {
  title: { absolute: "Login | Ghost Rentals" },
  description: "Sign in to access your bookings and exclusive services.",
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginPageClient />
    </Suspense>
  )
}
