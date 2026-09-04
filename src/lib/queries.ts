import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { ItemRow, PurchaseRow, SaleRow } from "./types";

const ITEM_SELECT = `
  id, user_id, item_type, status, is_demo, notes, created_at, updated_at,
  cards(*),
  sealed_products(*),
  card_images(*),
  condition_assessments(*),
  grading_assessments(*),
  market_prices(*),
  purchase_items(id, purchase_id, item_id, allocated_cost, purchases(*)),
  sale_items(id, sale_id, item_id, allocated_revenue, sales(*))
`;

/** PostgREST restituisce le relazioni 1:1 (cards, sealed_products) come oggetto, non array. */
function toArray<T>(value: T | T[] | null | undefined): T[] {
  if (Array.isArray(value)) return value;
  return value ? [value] : [];
}

function normalizeItem(row: Record<string, unknown>): ItemRow {
  return {
    ...row,
    cards: toArray(row["cards"] as never),
    sealed_products: toArray(row["sealed_products"] as never),
    card_images: toArray(row["card_images"] as never),
    condition_assessments: toArray(row["condition_assessments"] as never),
    grading_assessments: toArray(row["grading_assessments"] as never),
    market_prices: toArray(row["market_prices"] as never),
    purchase_items: toArray(row["purchase_items"] as never).map((pi: Record<string, unknown>) => ({
      ...pi,
      purchases: Array.isArray(pi["purchases"]) ? pi["purchases"][0] : pi["purchases"],
    })),
    sale_items: toArray(row["sale_items"] as never).map((si: Record<string, unknown>) => ({
      ...si,
      sales: Array.isArray(si["sales"]) ? si["sales"][0] : si["sales"],
    })),
  } as unknown as ItemRow;
}

export async function fetchItems(): Promise<ItemRow[]> {
  const { data, error } = await supabase
    .from("items")
    .select(ITEM_SELECT)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return ((data ?? []) as unknown as Record<string, unknown>[]).map(normalizeItem);
}


export const itemsQuery = () =>
  queryOptions({ queryKey: ["items"], queryFn: fetchItems, staleTime: 10_000 });

export async function fetchPurchases(): Promise<
  (PurchaseRow & { purchase_items: { id: string; item_id: string; allocated_cost: number }[] })[]
> {
  const { data, error } = await supabase
    .from("purchases")
    .select("*, purchase_items(id, item_id, allocated_cost)")
    .order("purchase_date", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as never;
}

export const purchasesQuery = () =>
  queryOptions({ queryKey: ["purchases"], queryFn: fetchPurchases });

export async function fetchSales(): Promise<
  (SaleRow & { sale_items: { id: string; item_id: string; allocated_revenue: number }[] })[]
> {
  const { data, error } = await supabase
    .from("sales")
    .select("*, sale_items(id, item_id, allocated_revenue)")
    .order("sale_date", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as never;
}

export const salesQuery = () => queryOptions({ queryKey: ["sales"], queryFn: fetchSales });

export async function currentUserId(): Promise<string> {
  const { data } = await supabase.auth.getUser();
  if (!data.user) throw new Error("Non autenticato");
  return data.user.id;
}
