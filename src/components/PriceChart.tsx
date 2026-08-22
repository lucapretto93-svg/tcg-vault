import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { PriceRow } from "@/lib/types";
import { eur } from "@/lib/calc";

export function PriceChart({ rows, height = 260 }: { rows: PriceRow[]; height?: number }) {
  const types = Array.from(new Set(rows.map((r) => r.price_type)));
  const byDate = new Map<string, Record<string, number | string>>();

  for (const r of rows) {
    const key = new Date(r.observed_at).toISOString().slice(0, 10);
    const entry = byDate.get(key) ?? { date: key };
    entry[r.price_type] = Number(r.value);
    byDate.set(key, entry);
  }
  const data = Array.from(byDate.values()).sort((a, b) =>
    String(a["date"]).localeCompare(String(b["date"])),
  );

  const palette = [
    "var(--color-chart-1)",
    "var(--color-chart-2)",
    "var(--color-chart-3)",
    "var(--color-chart-4)",
    "var(--color-chart-5)",
    "var(--color-primary)",
    "var(--color-success)",
  ];

  if (!data.length) {
    return (
      <p className="py-10 text-center text-sm text-muted-foreground">
        Nessun dato di prezzo registrato.
      </p>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid stroke="var(--color-border)" strokeDasharray="3 3" vertical={false} />
        <XAxis
          dataKey="date"
          stroke="var(--color-muted-foreground)"
          fontSize={11}
          tickFormatter={(v: string) => v.slice(5)}
        />
        <YAxis stroke="var(--color-muted-foreground)" fontSize={11} width={60} />
        <Tooltip
          contentStyle={{
            background: "var(--color-popover)",
            border: "1px solid var(--color-border)",
            borderRadius: 12,
            color: "var(--color-popover-foreground)",
            fontSize: 12,
          }}
          formatter={(value: number, name: string) => [eur(value), name]}
        />
        {types.map((t, i) => (
          <Line
            key={t}
            type="monotone"
            dataKey={t}
            stroke={palette[i % palette.length]}
            strokeWidth={2}
            dot={{ r: 2 }}
            connectNulls
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}
