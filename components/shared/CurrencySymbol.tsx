"use client";

import type { CSSProperties } from "react";
import { DirhamSymbol } from "dirham/react";
import type { SupportedCurrency } from "@/lib/currency";
import { getCurrencyConfig } from "@/lib/currency-service";
import styles from "./currencySymbol.module.css";

type CurrencySymbolProps = {
  code?: SupportedCurrency["code"];
  className?: string;
  style?: CSSProperties;
  /** Match surrounding price text weight (SVG stroke). */
  weight?: "regular" | "medium" | "semibold" | "bold";
};

/** Official UAE dirham sign (U+20C3 via dirham) or text symbol for other currencies. */
export function CurrencySymbol({
  code,
  className,
  style,
  weight = "bold",
}: CurrencySymbolProps) {
  const config = getCurrencyConfig(code ?? "AED");

  if (config.code === "AED") {
    return (
      <DirhamSymbol
        size="0.78em"
        weight={weight}
        aria-hidden
        className={[styles.aedSymbol, className].filter(Boolean).join(" ")}
        style={{ verticalAlign: "-0.08em", ...style }}
      />
    );
  }

  return (
    <span className={[styles.textSymbol, className].filter(Boolean).join(" ")}>
      {config.symbol}
    </span>
  );
}
