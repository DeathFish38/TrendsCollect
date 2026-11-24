interface SparklineProps {
  points: { capturedAt: string; score: number }[];
  /** Stroke color follows the day's direction; the PercentChange column carries the value. */
  direction?: "up" | "down" | "flat";
  width?: number;
  height?: number;
}

/**
 * Hand-rolled SVG sparkline — lighter than mounting a full charting
 * library per table row. Monochrome polyline; green/red stroke matches
 * the day's direction (color is redundant with the ▲▼ glyphs elsewhere
 * in the row, so direction is never color-alone).
 */
export default function Sparkline({
  points,
  direction = "flat",
  width = 120,
  height = 34,
}: SparklineProps) {
  const color =
    direction === "up"
      ? "var(--up)"
      : direction === "down"
        ? "var(--down)"
        : "var(--ink)";
  const pad = 2;
  const n = points.length;

  let polyline: string | null = null;
  let lastX = 0;
  let lastY = height / 2;

  if (n >= 2) {
    const values = points.map((p) => p.score);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const span = max - min;
    const coords = points.map((p, i) => {
      const x = pad + (i / (n - 1)) * (width - 2 * pad);
      const y =
        span === 0
          ? height / 2
          : height - pad - ((p.score - min) / span) * (height - 2 * pad);
      return { x, y };
    });
    lastX = coords[coords.length - 1].x;
    lastY = coords[coords.length - 1].y;
    polyline = coords.map((c) => `${c.x.toFixed(1)},${c.y.toFixed(1)}`).join(" ");
  }

  return (
    <svg
      className="sparkline"
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label={`Trend over ${n} snapshots, ${direction === "up" ? "rising" : direction === "down" ? "falling" : "flat"}`}
    >
      {polyline ? (
        <>
          <polyline
            points={polyline}
            fill="none"
            stroke={color}
            strokeWidth={1.5}
            strokeLinejoin="round"
            strokeLinecap="round"
          />
          <circle cx={lastX} cy={lastY} r={2} fill={color} />
        </>
      ) : (
        <line
          x1={pad}
          y1={height / 2}
          x2={width - pad}
          y2={height / 2}
          stroke="var(--hairline)"
          strokeDasharray="2,3"
          strokeWidth={1}
        />
      )}
    </svg>
  );
}
