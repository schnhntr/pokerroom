import { getCurrencyOption } from "@/lib/currencies";

export function formatCurrency(amount: number, currency: string, locale = "en-IN") {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    maximumFractionDigits: 2
  }).format(amount);
}

export function formatCurrencyCompact(code: string) {
  const option = getCurrencyOption(code);
  if (!option) {
    return code;
  }

  return `${option.symbol} ${option.code} — ${option.name}`;
}

export function formatChipCount(value: number) {
  return new Intl.NumberFormat("en-IN", {
    maximumFractionDigits: 2
  }).format(value);
}
