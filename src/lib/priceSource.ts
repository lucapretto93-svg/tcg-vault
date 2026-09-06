import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { currentUserId } from "./queries";

export interface PriceSourceRow {
  id: string;
  user_id: string;
  provider: string;
  enabled: boolean;
  notes: string | null;
  last_run_at: string | null;
  last_run_status: string | null;
  last_run_message: string | null;
}

export async function fetchPriceSource(): Promise<PriceSourceRow | null> {
  const { data, error } = await supabase.from("price_sources").select("*").limit(1).maybeSingle();
  if (error) throw new Error(error.message);
  return (data as unknown as PriceSourceRow) ?? null;
}

export const priceSourceQuery = () =>
  queryOptions({ queryKey: ["price_source"], queryFn: fetchPriceSource, staleTime: 60_000 });

export function isPriceSourceConfigured(row: PriceSourceRow | null): boolean {
  return !!row && row.enabled && row.provider !== "NONE" && row.provider.trim() !== "";
}

/** Salva la configurazione della fonte prezzi. Nessun prezzo viene generato o stimato. */
export async function savePriceSource(input: {
  provider: string;
  enabled: boolean;
  notes?: string | null;
}): Promise<void> {
  const userId = await currentUserId();
  const { error } = await supabase.from("price_sources").upsert(
    {
      user_id: userId,
      provider: input.provider,
      enabled: input.enabled,
      notes: input.notes ?? null,
    },
    { onConflict: "user_id" },
  );
  if (error) throw new Error(error.message);
}
