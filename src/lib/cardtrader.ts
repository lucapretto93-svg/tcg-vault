import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/** Lato client non esiste alcun token: solo dati già filtrati dal backend via RLS. */

export const CT_CONDITIONS = [
  "Mint",
  "Near Mint",
  "Slightly Played",
  "Moderately Played",
  "Played",
  "Heavily Played",
  "Poor",
] as const;

export const CT_LANGUAGES = ["en", "it", "jp", "de", "fr", "es"] as const;

export type DealStatus = "NEW" | "SEEN" | "IGNORED" | "SAVED" | "PURCHASED" | "EXPIRED";

export interface CardtraderSettings {
  id: string;
  user_id: string;
  radar_enabled: boolean;
  discount_threshold: number;
  max_price: number;
  allowed_conditions: string[];
  languages: string[];
  eras: string[];
  alert_deal_score: number;
  alert_discount: number;
  push_enabled: boolean;
  telegram_enabled: boolean;
  whatsapp_enabled: boolean;
  notes: string | null;
  last_scan_at: string | null;
  last_scan_status: string | null;
  last_scan_message: string | null;
}

export interface CardtraderDeal {
  id: string;
  product_id: string;
  blueprint_id: string | null;
  expansion_code: string | null;
  card_name: string;
  set_name: string | null;
  card_number: string | null;
  language: string | null;
  condition: string | null;
  foil: boolean;
  price: number;
  currency: string;
  all_in_cost: number | null;
  benchmark: number | null;
  benchmark_source: string | null;
  discount_pct: number | null;
  margin: number | null;
  roi: number | null;
  liquidity_score: number | null;
  quality_score: number | null;
  deal_score: number;
  seller_name: string | null;
  seller_country: string | null;
  zero_eligible: boolean;
  url: string | null;
  image_url: string | null;
  status: DealStatus;
  first_seen_at: string;
  last_seen_at: string;
}

export interface CardtraderListing {
  id: string;
  item_id: string;
  listing_id: string | null;
  blueprint_id: string | null;
  price: number;
  quantity: number;
  condition: string | null;
  language: string | null;
  status: string;
  last_error: string | null;
  synced_at: string | null;
}

async function userId(): Promise<string> {
  const { data } = await supabase.auth.getUser();
  const id = data.user?.id;
  if (!id) throw new Error("Sessione non valida");
  return id;
}

export async function fetchCardtraderSettings(): Promise<CardtraderSettings | null> {
  const { data, error } = await supabase
    .from("cardtrader_settings")
    .select("*")
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data as unknown as CardtraderSettings) ?? null;
}

export const cardtraderSettingsQuery = () =>
  queryOptions({
    queryKey: ["cardtrader_settings"],
    queryFn: fetchCardtraderSettings,
    staleTime: 30_000,
  });

export async function saveCardtraderSettings(
  input: Partial<Omit<CardtraderSettings, "id" | "user_id">>,
): Promise<void> {
  const id = await userId();
  const { error } = await supabase
    .from("cardtrader_settings")
    .upsert({ user_id: id, ...input } as never, { onConflict: "user_id" });
  if (error) throw new Error(error.message);
}

export async function fetchCardtraderDeals(): Promise<CardtraderDeal[]> {
  const { data, error } = await supabase
    .from("cardtrader_deals")
    .select("*")
    .order("deal_score", { ascending: false })
    .limit(200);
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as CardtraderDeal[];
}

export const cardtraderDealsQuery = () =>
  queryOptions({
    queryKey: ["cardtrader_deals"],
    queryFn: fetchCardtraderDeals,
    staleTime: 30_000,
  });

export async function setDealStatus(id: string, status: DealStatus): Promise<void> {
  const { error } = await supabase
    .from("cardtrader_deals")
    .update({ status } as never)
    .eq("id", id);
  if (error) throw new Error(error.message);
}

export async function fetchCardtraderListings(): Promise<CardtraderListing[]> {
  const { data, error } = await supabase.from("cardtrader_listings").select("*");
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as CardtraderListing[];
}

export const cardtraderListingsQuery = () =>
  queryOptions({
    queryKey: ["cardtrader_listings"],
    queryFn: fetchCardtraderListings,
    staleTime: 30_000,
  });

/** Ordinamento predefinito: affare migliore e più urgente in cima. */
export function sortDeals(deals: CardtraderDeal[]): CardtraderDeal[] {
  return [...deals].sort((a, b) => {
    if (a.status === "NEW" && b.status !== "NEW") return -1;
    if (b.status === "NEW" && a.status !== "NEW") return 1;
    if (b.deal_score !== a.deal_score) return b.deal_score - a.deal_score;
    return new Date(b.last_seen_at).getTime() - new Date(a.last_seen_at).getTime();
  });
}

export function activeDeals(deals: CardtraderDeal[]): CardtraderDeal[] {
  return deals.filter((d) => d.status !== "IGNORED" && d.status !== "EXPIRED");
}

export function newDealsCount(deals: CardtraderDeal[]): number {
  return deals.filter((d) => d.status === "NEW").length;
}
