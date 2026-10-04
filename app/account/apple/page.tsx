"use client";

import { Suspense, useEffect } from "react";
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

function AppleCallbackInner() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const appleToken = searchParams.get("appleToken");
    const provider = searchParams.get("provider");

    if (!appleToken || (provider && provider !== "apple")) {
      router.replace("/auth/login?error=missing_apple_token");
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
        const res = await googleOrAppleLoginRegister(appleToken, "customer", "apple", referralCode || undefined);
        if (res.code === 200 && res.token) {
          persistAuthSession(res.token, (res.result ?? {}) as Record<string, unknown>)
          if (res.isNewUser) {
            if (referralCode) storePendingReferralCode(referralCode)
            sessionStorage.setItem(POST_OAUTH_ONBOARDING_NEXT_SESSION_KEY, next);
            router.replace("/onboarding");
            return;
          }
          storePendingReferralCode('')
          router.replace(next);
          return;
        }
      } catch {
        // no-op; redirect below
      }

      router.replace("/auth/login?error=apple_login_failed");
    })();
  }, [router, searchParams]);

  return (
    <div style={{ padding: 24, maxWidth: 720, margin: "0 auto" }}>
      <p>Signing you in with Apple...</p>
    </div>
  );
}

export default function AppleCallbackPage() {
  return (
    <Suspense>
      <AppleCallbackInner />
    </Suspense>
  );
}

