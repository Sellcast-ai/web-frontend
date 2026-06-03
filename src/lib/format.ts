const MEDIA_ORIGIN =
  process.env.NEXT_PUBLIC_MEDIA_ORIGIN ?? "http://127.0.0.1:8000";

/** Resolve a media path: absolute URLs pass through; relative paths get the backend origin. */
export function mediaUrl(u: string | null | undefined): string | undefined {
  if (!u) return undefined;
  if (/^https?:\/\//.test(u)) return u;
  return `${MEDIA_ORIGIN}${u.startsWith("/") ? "" : "/"}${u}`;
}

export function compact(n: number | null | undefined): string {
  if (n == null) return "—";
  return new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(n);
}

export function money(
  n: number | null | undefined,
  currency = "USD",
): string {
  if (n == null) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: n < 100 ? 2 : 0,
  }).format(n);
}

export function priceRange(
  min: number | null | undefined,
  max: number | null | undefined,
  currency = "USD",
): string {
  if (min == null && max == null) return "—";
  if (min == null || max == null || min === max) return money(min ?? max, currency);
  return `${money(min, currency)}–${money(max, currency)}`;
}

export function percent(frac: number | null | undefined): string {
  if (frac == null) return "—";
  const sign = frac > 0 ? "+" : "";
  return `${sign}${(frac * 100).toFixed(0)}%`;
}

export function commission(rate: number | null | undefined): string {
  if (rate == null) return "—";
  return `${(rate * 100).toFixed(0)}%`;
}

export function relativeTime(iso: string | null | undefined): string {
  if (!iso) return "";
  const then = new Date(iso).getTime();
  const diff = Date.now() - then;
  const mins = Math.round(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.round(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}
