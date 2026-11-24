import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { HistoryPoint, HistoryWindow } from "../api/types";
import { formatScore, parseUtc } from "../lib/format";

interface ScoreChartProps {
  points: HistoryPoint[];
  window: HistoryWindow;
}

interface TooltipCardProps {
  active?: boolean;
  payload?: Array<{ payload: HistoryPoint }>;
}

/** Monospace tooltip card: time, score, story count. */
function TooltipCard({ active, payload }: TooltipCardProps) {
  if (!active || !payload || payload.length === 0) return null;
  const point = payload[0].payload;
  const d = parseUtc(point.capturedAt);
  return (
    <div className="chart-tip">
      <div className="chart-tip__time">
        {d.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" })}{" "}
        {d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "UTC" })} UTC
      </div>
      <div>
        score <strong>{formatScore(point.score)}</strong>
      </div>
      <div>
        {point.storyCount} {point.storyCount === 1 ? "story" : "stories"}
      </div>
    </div>
  );
}

/** Black line and a nearly invisible ink wash on white; no gradients or shadows. */
export default function ScoreChart({ points, window }: ScoreChartProps) {
  const data = points.map((p) => ({ ...p, t: parseUtc(p.capturedAt).getTime() }));

  const tickFormat = (t: number) => {
    const d = new Date(t);
    return window === "24h"
      ? d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "UTC" })
      : d.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
  };

  return (
    <div className="score-chart">
      <ResponsiveContainer width="100%" height={320}>
        <AreaChart data={data} margin={{ top: 12, right: 8, bottom: 4, left: 0 }}>
          <CartesianGrid stroke="var(--hairline)" vertical={false} />
          <XAxis
            dataKey="t"
            type="number"
            scale="time"
            domain={["dataMin", "dataMax"]}
            tickFormatter={tickFormat}
            tick={{ fill: "var(--muted)", fontSize: 11, fontFamily: "var(--mono)" }}
            tickLine={false}
            axisLine={{ stroke: "var(--hairline)" }}
            minTickGap={56}
          />
          <YAxis
            tickFormatter={(v: number) => formatScore(v)}
            width={58}
            domain={[0, "auto"]}
            tick={{ fill: "var(--muted)", fontSize: 11, fontFamily: "var(--mono)" }}
            tickLine={false}
            axisLine={false}
            allowDecimals={false}
          />
          <Tooltip
            content={<TooltipCard />}
            cursor={{ stroke: "var(--muted)", strokeDasharray: "3,3" }}
          />
          <Area
            type="monotone"
            dataKey="score"
            stroke="var(--ink)"
            strokeWidth={2}
            fill="var(--ink)"
            fillOpacity={0.06}
            dot={data.length === 1}
            activeDot={{ r: 3, strokeWidth: 0 }}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
      {data.length < 2 && (
        <div className="chart-note">
          Waiting for snapshots — the chart draws as the collector runs.
        </div>
      )}
    </div>
  );
}
