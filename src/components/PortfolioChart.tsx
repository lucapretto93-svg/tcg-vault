import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { eur } from "@/lib/calc";
import type { SnapshotRow } from "@/lib/portfolio";

const SERIES: { key: keyof SnapshotRow; label: string; color: string }[] = [
  { key: "total_value", label: "Valore totale", color: "var(--color-chart-1)" },
  { key: "cost_basis", label: "Capitale investito", color: "var(--color-chart-2)" },
  { key: "raw_value", label: "Raw", color: "var(--color-chart-3)" },
  { key: "slab_value", label: "Slab", color: "var(--color-chart-4)" },
  { key: "sealed_value", label: "Sealed", color: "var(--color-chart-5)" },
];

export function PortfolioChart({ rows, height = 260 }: { rows: SnapshotRow[]; height?: number }) {
  if (rows.length < 2) {
    return (
      <p className="py-10 text-center text-sm text-muted-foreground">
        Storico in costruzione: serve almeno un secondo giorno di rilevazioni.
      </p>
    );
  }

  const data = rows.map((r) => ({
    date: r.snapshot_date,
    total_value: Number(r.total_value),
    cost_basis: Number(r.cost_basis),
    raw_value: Number(r.raw_value),
    slab_value: Number(r.slab_value),
    sealed_value: Number(r.sealed_value),
  }));

  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
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
        {SERIES.map((s) => (
          <Area
            key={String(s.key)}
            type="monotone"
            dataKey={String(s.key)}
            name={s.label}
            stroke={s.color}
            fill={s.color}
            fillOpacity={0.12}
            strokeWidth={2}
          />
        ))}
      </AreaChart>
    </ResponsiveContainer>
  );
}
