import type { ReactNode } from "react";
import styles from "./currencySymbol.module.css";

type StrikePriceWrapProps = {
  children: ReactNode;
  className?: string;
};

/** Strikethrough wrapper for prices with dirham SVG (pseudo line centered on text). */
export function StrikePriceWrap({ children, className }: StrikePriceWrapProps) {
  return (
    <span className={[styles.strikeWrap, className].filter(Boolean).join(" ")}>
      {children}
    </span>
  );
}
