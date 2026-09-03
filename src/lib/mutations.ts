import { supabase } from "@/integrations/supabase/client";
import { currentUserId } from "./queries";
import type { CardInput, PriceType } from "./types";

export async function addPrice(input: {
  itemId: string;
  price_type: PriceType;
  value: number;
  currency?: string;
  source?: string;
  observed_at?: string;
}) {
  const { error } = await supabase.from("market_prices").insert({
    item_id: input.itemId,
    price_type: input.price_type,
    value: input.value,
    currency: input.currency ?? "EUR",
    source: input.source ?? "Manuale",
    observed_at: input.observed_at ?? new Date().toISOString(),
  });
  if (error) throw new Error(error.message);
}

export async function createItemWithPurchase(input: {
  item_type: "CARD" | "SEALED";
  card?: Record<string, unknown>;
  sealed?: Record<string, unknown>;
  purchase?:
    | {
        purchase_date: string;
        platform: string;
        seller: string;
        item_price: number;
        shipping: number;
        fees: number;
        taxes: number;
        notes: string;
      }
    | undefined;
  rawValue?: number | undefined;
  notes?: string | undefined;
}) {
  const userId = await currentUserId();
  const { data: item, error } = await supabase
    .from("items")
    .insert({ user_id: userId, item_type: input.item_type, notes: input.notes ?? null })
    .select("id")
    .single();
  if (error || !item) throw new Error(error?.message ?? "Errore creazione item");

  if (input.item_type === "CARD" && input.card) {
    const { error: e } = await supabase
      .from("cards")
      .insert({ ...(input.card as Record<string, unknown>), item_id: item.id } as never);
    if (e) throw new Error(e.message);
  }
  if (input.item_type === "SEALED" && input.sealed) {
    const { error: e } = await supabase
      .from("sealed_products")
      .insert({ ...(input.sealed as Record<string, unknown>), item_id: item.id } as never);
    if (e) throw new Error(e.message);
  }

  if (input.rawValue && input.rawValue > 0) {
    await addPrice({
      itemId: item.id,
      price_type: input.item_type === "CARD" ? "RAW" : "SEALED",
      value: input.rawValue,
      source: "Inserimento manuale",
    });
  }

  if (input.purchase) {
    const p = input.purchase;
    const total = p.item_price + p.shipping + p.fees + p.taxes;
    const { data: purchase, error: pe } = await supabase
      .from("purchases")
      .insert({
        user_id: userId,
        purchase_date: p.purchase_date,
        platform: p.platform || null,
        seller: p.seller || null,
        item_price: p.item_price,
        shipping: p.shipping,
        fees: p.fees,
        taxes: p.taxes,
        total_cost: total,
        notes: p.notes || null,
      })
      .select("id")
      .single();
    if (pe || !purchase) throw new Error(pe?.message ?? "Errore acquisto");
    const { error: pie } = await supabase
      .from("purchase_items")
      .insert({ purchase_id: purchase.id, item_id: item.id, allocated_cost: total });
    if (pie) throw new Error(pie.message);
  }

  return item.id;
}

export async function sellItem(input: {
  itemId: string;
  sale_date: string;
  platform: string;
  buyer: string;
  gross_revenue: number;
  shipping: number;
  fees: number;
  taxes: number;
  notes: string;
}) {
  const userId = await currentUserId();
  const net = input.gross_revenue + input.shipping - input.fees - input.taxes;
  const { data: sale, error } = await supabase
    .from("sales")
    .insert({
      user_id: userId,
      sale_date: input.sale_date,
      platform: input.platform || null,
      buyer: input.buyer || null,
      gross_revenue: input.gross_revenue,
      shipping: input.shipping,
      fees: input.fees,
      taxes: input.taxes,
      net_revenue: net,
      notes: input.notes || null,
    })
    .select("id")
    .single();
  if (error || !sale) throw new Error(error?.message ?? "Errore vendita");

  const { error: sie } = await supabase
    .from("sale_items")
    .insert({ sale_id: sale.id, item_id: input.itemId, allocated_revenue: net });
  if (sie) throw new Error(sie.message);

  const { error: ue } = await supabase
    .from("items")
    .update({ status: "SOLD" })
    .eq("id", input.itemId);
  if (ue) throw new Error(ue.message);
}

export async function saveGrading(input: Record<string, unknown> & { item_id: string }) {
  const { error } = await supabase.from("grading_assessments").insert(input as never);
  if (error) throw new Error(error.message);
}

export async function saveGradingResult(
  gradingId: string,
  input: {
    actual_company: string;
    actual_grade: number;
    certificate_number: string | null;
    submitted_at: string | null;
    graded_at: string | null;
    returned_at: string | null;
    actual_grading_cost: number | null;
    result_notes: string | null;
  },
) {
  const { error } = await supabase
    .from("grading_assessments")
    .update(input as never)
    .eq("id", gradingId);
  if (error) throw new Error(error.message);
}

export async function saveCondition(input: Record<string, unknown> & { item_id: string }) {
  const { error } = await supabase.from("condition_assessments").insert(input as never);
  if (error) throw new Error(error.message);
}

export async function uploadImage(itemId: string, file: File, type: "FRONT" | "BACK" | "EXTRA") {
  const userId = await currentUserId();
  const path = `${userId}/${itemId}/${type}-${Date.now()}-${file.name.replace(/[^\w.-]/g, "_")}`;
  const { error } = await supabase.storage.from("item-images").upload(path, file);
  if (error) throw new Error(error.message);
  const { error: ie } = await supabase
    .from("card_images")
    .insert({ item_id: itemId, image_type: type, url: path, storage_path: path });
  if (ie) {
    await supabase.storage.from("item-images").remove([path]);
    throw new Error(ie.message);
  }
}

export async function updateItemWithRawValue(
  itemId: string,
  card: CardInput,
  notes: string,
  rawValue?: number,
) {
  await updateCard(itemId, card, notes);

  if (rawValue === undefined) return;

  const { data, error } = await supabase
    .from("market_prices")
    .select("value")
    .eq("item_id", itemId)
    .eq("price_type", "RAW")
    .order("observed_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (Number(data?.value) === rawValue) return;

  await addPrice({
    itemId,
    price_type: "RAW",
    value: rawValue,
    source: "Aggiornamento manuale",
  });
}

export async function updateCard(itemId: string, card: Record<string, unknown>, notes?: string) {
  const { error } = await supabase
    .from("cards")
    .update(card as never)
    .eq("item_id", itemId);
  if (error) throw new Error(error.message);
  const { error: ie } = await supabase
    .from("items")
    .update({ notes: notes ?? null })
    .eq("id", itemId);
  if (ie) throw new Error(ie.message);
}

export async function updateSealed(
  itemId: string,
  sealed: Record<string, unknown>,
  notes?: string,
) {
  const { error } = await supabase
    .from("sealed_products")
    .update(sealed as never)
    .eq("item_id", itemId);
  if (error) throw new Error(error.message);
  const { error: ie } = await supabase
    .from("items")
    .update({ notes: notes ?? null })
    .eq("id", itemId);
  if (ie) throw new Error(ie.message);
}

export async function updateItemStatus(itemId: string, status: string) {
  const { error } = await supabase
    .from("items")
    .update({ status: status as never })
    .eq("id", itemId);
  if (error) throw new Error(error.message);
}

export async function deleteItem(itemId: string) {
  const { error } = await supabase.from("items").delete().eq("id", itemId);
  if (error) throw new Error(error.message);
}
