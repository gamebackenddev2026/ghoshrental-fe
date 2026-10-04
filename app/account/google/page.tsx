"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  POST_OAUTH_RETURN_SESSION_KEY,
  POST_OAUTH_ONBOARDING_NEXT_SESSION_KEY,
} from "@/lib/config";
import { googleOrAppleLoginRegister } from "@/lib/api/auth";
import { persistAuthSession } from "@/lib/authSession";
import { peekPendingReferralCode, storePendingReferralCode } from "@/lib/referral";

function safeInternalPath(raw: string | null): string {
  if (!raw) return "/";
  let decoded = raw;
  try {
    decoded = decodeURIComponent(raw);
  } catch {
    decoded = raw;
  }
  if (decoded.startsWith("/") && !decoded.startsWith("//")) return decoded;
  return "/";
}

function GoogleCallbackInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string>("");

  useEffect(() => {
    const googleToken = searchParams.get("googleToken");
    const provider = searchParams.get("provider");

    if (!googleToken || (provider && provider !== "google")) {
      router.replace("/auth/login?error=google_callback");
      return;
    }

    let next = "/";
    if (typeof window !== "undefined") {
      const stored = sessionStorage.getItem(POST_OAUTH_RETURN_SESSION_KEY);
      next = safeInternalPath(stored);
      sessionStorage.removeItem(POST_OAUTH_RETURN_SESSION_KEY);
    }

    (async () => {
      try {
        const referralCode = peekPendingReferralCode()
        // Backend "token login API" flow
        const res = await googleOrAppleLoginRegister(googleToken, "customer", "google", referralCode || undefined);
        if (res.code === 200 && res.token) {
          persistAuthSession(res.token, (res.result ?? {}) as Record<string, unknown>)
          if (res.isNewUser) {
            // Keep code for onboarding apply fallback if signup body did not attach it.
            if (referralCode) storePendingReferralCode(referralCode)
            sessionStorage.setItem(POST_OAUTH_ONBOARDING_NEXT_SESSION_KEY, next);
            router.replace("/onboarding");
            return;
          }
          storePendingReferralCode('')
          router.replace(next);
          return;
        }

        // Fallback: if backend already minted an app token and sends it as googleToken
        localStorage.setItem("ghostrentals-web-token", googleToken);
        router.replace(next);
      } catch {
        setError("Google sign-in failed. Please try again.");
      }
    })();
  }, [router, searchParams]);

  if (!error) return null;
  return (
    <div style={{ padding: 24, maxWidth: 720, margin: "0 auto" }}>
      <p>{error}</p>
    </div>
  );
}

export default function GoogleCallbackPage() {
  return (
    <Suspense>
      <GoogleCallbackInner />
    </Suspense>
  );
}

