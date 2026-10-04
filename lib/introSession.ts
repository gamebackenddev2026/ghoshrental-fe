const INTRO_STORAGE_KEY = "introPlayed";
const INTRO_EXPIRY_MS = 60 * 60 * 1000;

export function isIntroValid(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const raw = window.sessionStorage.getItem(INTRO_STORAGE_KEY);
    if (!raw) return false;
    const parsed = JSON.parse(raw) as { expiresAt?: number };
    if (!parsed?.expiresAt || Date.now() > parsed.expiresAt) {
      window.sessionStorage.removeItem(INTRO_STORAGE_KEY);
      return false;
    }
    return true;
  } catch {
    window.sessionStorage.removeItem(INTRO_STORAGE_KEY);
    return false;
  }
}

export function setIntroPlayed(): void {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(
    INTRO_STORAGE_KEY,
    JSON.stringify({ played: true, expiresAt: Date.now() + INTRO_EXPIRY_MS }),
  );
}
