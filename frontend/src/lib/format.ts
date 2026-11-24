// Display formatting helpers. Backend timestamps are UTC:
// - SQLite snapshots: "YYYY-MM-DD HH:MM:SS" (no zone marker)
// - HN story created_at: ISO-8601 with "Z"
// Both must be parsed as UTC, not local time.

export function parseUtc(iso: string): Date {
  const withT = iso.includes("T") ? iso : iso.replace(" ", "T");
  const withZone = withT.endsWith("Z") ? withT : `${withT}Z`;
  return new Date(withZone);
}

export function formatScore(value: number): string {
  return value.toLocaleString("en-US", { maximumFractionDigits: 1 });
}

/** "+12.4%" / "-4.1%" — sign included; direction glyphs are added by the caller. */
export function formatPctChange(value: number): string {
  return `${value > 0 ? "+" : ""}${value.toFixed(1)}%`;
}

export function timeAgo(iso: string | null, now = Date.now()): string {
  if (!iso) return "—";
  const then = parseUtc(iso).getTime();
  if (Number.isNaN(then)) return "—";
  const seconds = Math.max(0, Math.floor((now - then) / 1000));

  if (seconds < 45) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    const rem = minutes % 60;
    return rem > 0 ? `${hours} hr ${rem} min ago` : `${hours} hr ago`;
  }
  const days = Math.floor(hours / 24);
  return days === 1 ? "yesterday" : `${days} days ago`;
}

/** Exact UTC timestamp for hover tooltips on relative times. */
export function formatUtc(iso: string): string {
  const date = parseUtc(iso);
  if (Number.isNaN(date.getTime())) return "Unknown time";
  return `${date.toISOString().slice(0, 19).replace("T", " ")} UTC`;
}

/** Source domain for a story URL, e.g. "github.com". */
export function domainOf(url: string | null): string | null {
  if (!url) return null;
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}
