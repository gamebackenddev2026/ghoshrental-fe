"use client";

import { useCallback, useEffect, useState } from "react";
import type { ActivePromo } from "@/lib/api/adapters";
import { loadActivePromo } from "@/lib/api/promo";
import { dismissPromoPopup } from "@/lib/api/home";
import { getClientAuthToken } from "@/lib/authToken";
import { dismissGuestPromo, isGuestPromoDismissed } from "@/lib/promoStorage";
import { PromotionalPopup } from "./PromotionalPopup";

type PromotionalPopupGateProps = {
  /** Server-fetched promo — shown immediately for guests before client refetch. */
  initialPromo?: ActivePromo | null;
};

export function PromotionalPopupGate({
  initialPromo = null,
}: PromotionalPopupGateProps) {
  const [promo, setPromo] = useState<ActivePromo | null>(() => {
    if (typeof window !== "undefined" && getClientAuthToken()) return null;
    return initialPromo ?? null;
  });
  const [visible, setVisible] = useState(false);
  const [ctaHref, setCtaHref] = useState("/auth/register");

  // Fetch immediately on mount — do not wait for idle home-page batch.
  useEffect(() => {
    let cancelled = false;

    void loadActivePromo(getClientAuthToken())
      .then((next) => {
        if (!cancelled) setPromo(next);
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!promo?.id) {
      setVisible(false);
      return;
    }

    const token = getClientAuthToken();
    if (!token && isGuestPromoDismissed(promo.id)) {
      setVisible(false);
      return;
    }

    setCtaHref(token ? "/product/search" : "/auth/register");
    setVisible(true);
  }, [promo]);

  useEffect(() => {
    if (!visible) return;
    document.body.classList.add("popup-open");
    return () => {
      document.body.classList.remove("popup-open");
    };
  }, [visible]);

  const handleClose = useCallback(() => {
    if (!promo?.id) return;

    const token = getClientAuthToken();
    if (token) {
      void dismissPromoPopup(promo.id, token).catch((error) => {
        if (process.env.NODE_ENV !== "production") {
          // eslint-disable-next-line no-console
          console.warn("[promo] dismiss API failed", error);
        }
      });
    } else {
      dismissGuestPromo(promo.id);
    }

    setVisible(false);
    document.body.classList.remove("popup-open");
  }, [promo?.id]);

  if (!visible || !promo) return null;

  return (
    <PromotionalPopup promo={promo} ctaHref={ctaHref} onClose={handleClose} />
  );
}
