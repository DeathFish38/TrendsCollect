import { formatPctChange } from "../lib/format";

interface PercentChangeProps {
  value: number | null;
  size?: "sm" | "lg";
}

/**
 * Daily move, stock-style. Green/red with ▲▼ glyphs and an explicit sign —
 * direction is never communicated by color alone.
 * null (no prior snapshot) renders as a neutral "—", like a fresh IPO.
 */
export default function PercentChange({ value, size = "sm" }: PercentChangeProps) {
  const sizeClass = size === "lg" ? " pct--lg" : "";

  if (value === null) {
    return <span className={`pct pct--flat${sizeClass}`}>—</span>;
  }

  if (value === 0) {
    return <span className={`pct pct--flat${sizeClass}`}>0.0%</span>;
  }

  const cls = value > 0 ? "pct--up" : "pct--down";
  const glyph = value > 0 ? "▲" : "▼";
  return (
    <span className={`pct ${cls}${sizeClass}`}>
      {glyph} {formatPctChange(value)}
    </span>
  );
}
