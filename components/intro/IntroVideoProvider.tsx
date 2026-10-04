"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type MouseEvent,
  type ReactNode,
} from "react";
import { usePathname, useRouter } from "next/navigation";
import { IntroVideoOverlay } from "@/components/intro/IntroVideoOverlay";
import { isIntroValid, setIntroPlayed } from "@/lib/introSession";

type IntroVideoContextValue = {
  /** True after intro video has played once this session. */
  introAlreadySeen: boolean;
  /** First visit / logo (before intro seen): play video. After that: plain link to home. */
  handleLogoClick: (event: MouseEvent<HTMLAnchorElement>) => void;
};

const IntroVideoContext = createContext<IntroVideoContextValue | null>(null);

export function useIntroVideo(): IntroVideoContextValue {
  const ctx = useContext(IntroVideoContext);
  if (!ctx) {
    throw new Error("useIntroVideo must be used within IntroVideoProvider");
  }
  return ctx;
}

export function IntroVideoProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [introAlreadySeen, setIntroAlreadySeen] = useState(false);
  const [showIntro, setShowIntro] = useState(false);
  const firstVisitCheckedRef = useRef(false);

  const goHomeAfterIntro = useCallback(() => {
    setIntroPlayed();
    setIntroAlreadySeen(true);
    setShowIntro(false);
    router.push("/");
  }, [router]);

  const handleLogoClick = useCallback(
    (event: MouseEvent<HTMLAnchorElement>) => {
      if (introAlreadySeen || isIntroValid()) return;
      event.preventDefault();
      setShowIntro(true);
    },
    [introAlreadySeen],
  );

  useEffect(() => {
    if (firstVisitCheckedRef.current) return;
    firstVisitCheckedRef.current = true;
    const seen = isIntroValid();
    setIntroAlreadySeen(seen);
    // Only auto-play the intro when the user lands directly on the homepage
    if (!seen && pathname === '/') {
      setShowIntro(true);
    }
  }, [pathname]);

  return (
    <IntroVideoContext.Provider value={{ introAlreadySeen, handleLogoClick }}>
      {children}
      {showIntro ? <IntroVideoOverlay onFinished={goHomeAfterIntro} /> : null}
    </IntroVideoContext.Provider>
  );
}
