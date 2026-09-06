import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { currentUserId } from "./queries";
import { segmentValues } from "./analytics";
import type { ItemRow } from "./types";

export interface SnapshotRow {
  id: string;
  user_id: string;
  snapshot_date: string;
  total_value: number;
  cost_basis: number;
  profit_loss: number;
  raw_value: number;
  slab_value: number;
  sealed_value: number;
  item_count: number;
  currency: string;
}

export type RangeKey = "7G" | "30G" | "90G" | "1A";

export const RANGE_DAYS: Record<RangeKey, number> = { "7G": 7, "30G": 30, "90G": 90, "1A": 365 };

export async function fetchSnapshots(): Promise<SnapshotRow[]> {
  const { data, error } = await supabase
    .from("portfolio_snapshots")
    .select("*")
    .order("snapshot_date", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as SnapshotRow[];
}

export const snapshotsQuery = () =>
  queryOptions({ queryKey: ["portfolio_snapshots"], queryFn: fetchSnapshots, staleTime: 60_000 });

/** Scrive (o aggiorna) lo snapshot di oggi. Idempotente: una sola riga per giorno. */
export async function upsertTodaySnapshot(items: ItemRow[]): Promise<void> {
  const userId = await currentUserId();
  const s = segmentValues(items);
  const today = new Date().toISOString().slice(0, 10);
  const { error } = await supabase.from("portfolio_snapshots").upsert(
    {
      user_id: userId,
      snapshot_date: today,
      total_value: s.total,
      cost_basis: s.cost,
      profit_loss: s.profitLoss,
      raw_value: s.raw,
      slab_value: s.slab,
      sealed_value: s.sealed,
      item_count: s.count,
    },
    { onConflict: "user_id,snapshot_date" },
  );
  if (error) throw new Error(error.message);
}

export function filterRange(rows: SnapshotRow[], range: RangeKey): SnapshotRow[] {
  const from = Date.now() - RANGE_DAYS[range] * 86_400_000;
  return rows.filter((r) => +new Date(r.snapshot_date) >= from);
}

/** Variazione del portafoglio rispetto allo snapshot precedente disponibile. */
export function portfolioDailyChange(
  rows: SnapshotRow[],
): { abs: number; pct: number | null } | null {
  if (rows.length < 2) return null;
  const last = rows[rows.length - 1]!;
  const prev = rows[rows.length - 2]!;
  const abs = Number(last.total_value) - Number(prev.total_value);
  const base = Number(prev.total_value);
  return { abs, pct: base > 0 ? (abs / base) * 100 : null };
}
