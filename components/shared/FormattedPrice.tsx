"use client";

import { CurrencySymbol } from "@/components/shared/CurrencySymbol";
import {
  convertFromAED,
  formatPriceAmount,
  getCurrencyConfig,
  getSelectedCurrency,
} from "@/lib/currency-service";
import type { SupportedCurrency } from "@/lib/currency";
import styles from "./currencySymbol.module.css";

type FormattedPriceProps = {
  amount: number;
  /** Amount is stored in AED (default for product prices). */
  fromAED?: boolean;
  currencyCode?: SupportedCurrency["code"];
  className?: string;
  /** Strikethrough for compare-at / was prices. */
  strikethrough?: boolean;
  /** Decimal places — defaults to 0 (whole numbers) for existing product cards. */
  fractionDigits?: number;
};

/**
 * UI price with the correct currency symbol — custom AED image or € $ £ text.
 */
export function FormattedPrice({
  amount,
  fromAED = false,
  currencyCode,
  className,
  strikethrough = false,
  fractionDigits = 0,
}: FormattedPriceProps) {
  const code = currencyCode ?? getSelectedCurrency();
  const value = fromAED ? convertFromAED(amount, code) : amount;
  const formatted = formatPriceAmount(value, fractionDigits);
  const config = getCurrencyConfig(code);

  if (config.code === "AED") {
    return (
      <span
        className={[
          styles.priceWrap,
          strikethrough ? styles.priceWrapStrikethrough : "",
          className,
        ]
          .filter(Boolean)
          .join(" ")}
      >
        <CurrencySymbol
          code="AED"
          style={strikethrough ? { verticalAlign: "0.05em" } : undefined}
        />
        <span>{formatted}</span>
      </span>
    );
  }

  const glued = code === "USD" || code === "EUR" || code === "GBP";
  return (
    <span className={className}>
      {glued ? (
        <>
          {config.symbol}
          {formatted}
        </>
      ) : (
        <>
          {config.symbol} {formatted}
        </>
      )}
    </span>
  );
}
