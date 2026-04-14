export function formatPrice(cents: number, currency = "CAD") {
  return new Intl.NumberFormat("fr-CA", {
    style: "currency",
    currency,
  }).format(cents / 100);
}