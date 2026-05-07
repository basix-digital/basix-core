const numberFormatter = new Intl.NumberFormat("en-US");
const compactNumberFormatter = new Intl.NumberFormat("en-US", {
  notation: "compact",
  maximumFractionDigits: 1,
});
const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});
const dateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
});

export function formatNumber(value: number | null | undefined) {
  return numberFormatter.format(value ?? 0);
}

export function formatCompactNumber(value: number | null | undefined) {
  return compactNumberFormatter.format(value ?? 0);
}

export function formatPercent(value: number | null | undefined) {
  return `${Math.round((value ?? 0) * 100)}%`;
}

export function formatCurrencyFromCents(value: number | null | undefined) {
  return currencyFormatter.format((value ?? 0) / 100);
}

export function formatDate(value: string | Date | null | undefined) {
  if (!value) {
    return "Never";
  }

  return dateFormatter.format(new Date(value));
}

export function formatLatency(value: number | null | undefined) {
  return `${numberFormatter.format(Math.round(value ?? 0))} ms`;
}
