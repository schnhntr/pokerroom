import { CurrencyOption } from "@/lib/types";

const fallbackCurrencies = [
  "INR",
  "USD",
  "EUR",
  "GBP",
  "AED",
  "SGD",
  "JPY",
  "CAD",
  "AUD",
  "THB",
  "PHP",
  "HKD",
  "SAR"
];

export function getCurrencyOptions(locale = "en") {
  const codes = typeof Intl.supportedValuesOf === "function"
    ? Intl.supportedValuesOf("currency")
    : fallbackCurrencies;

  const displayNames = new Intl.DisplayNames([locale], { type: "currency" });

  return codes
    .map((code) => {
      const parts = new Intl.NumberFormat(locale, {
        style: "currency",
        currency: code,
        currencyDisplay: "narrowSymbol"
      }).formatToParts(1);
      const symbol = parts.find((part) => part.type === "currency")?.value ?? code;
      const name = displayNames.of(code) ?? code;

      return {
        code,
        symbol,
        name
      } satisfies CurrencyOption;
    })
    .sort((a, b) => a.code.localeCompare(b.code));
}

export function getCurrencyOption(code: string, locale = "en") {
  return getCurrencyOptions(locale).find((option) => option.code === code);
}
