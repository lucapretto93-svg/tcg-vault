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

export async function fetchItems(): Promise<ItemRow[]> {
  const { data, error } = await supabase
    .from("items")
    .select(ITEM_SELECT)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as ItemRow[];
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
