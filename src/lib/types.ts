export type ItemType = "CARD" | "SEALED";
export type ItemStatus = "OWNED" | "GRADING" | "LISTED" | "SOLD";
export type PriceType =
  | "RAW"
  | "PSA1"
  | "PSA2"
  | "PSA3"
  | "PSA4"
  | "PSA5"
  | "PSA6"
  | "PSA7"
  | "PSA8"
  | "PSA9"
  | "PSA10"
  | "SEALED";

export const PRICE_TYPES: PriceType[] = [
  "RAW",
  "PSA1",
  "PSA2",
  "PSA3",
  "PSA4",
  "PSA5",
  "PSA6",
  "PSA7",
  "PSA8",
  "PSA9",
  "PSA10",
  "SEALED",
];
export const PSA_GRADES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] as const;

export const PRODUCT_TYPES = [
  "ETB",
  "Booster Box",
  "Booster Bundle",
  "Collection Box",
  "Tin",
  "Blister",
  "Display",
  "UPC",
  "Deck",
  "Altro",
] as const;

export const LANGUAGES = ["IT", "EN", "JP", "DE", "FR", "ES", "KR", "CN"] as const;

export const CONDITIONS = ["GEM MT", "MINT", "NM", "EX", "GD", "LP", "PL", "PO"] as const;

export const RECOMMENDATIONS = ["GRADA", "VALUTA", "NON GRADARE"] as const;

export interface CardRow {
  id: string;
  item_id: string;
  pokemon_name: string;
  card_name: string;
  set_name: string | null;
  set_code: string | null;
  card_number: string | null;
  set_total: string | null;
  year: number | null;
  language: string | null;
  rarity: string | null;
  variant: string | null;
  holo: boolean;
  reverse_holo: boolean;
  first_edition: boolean;
  unlimited: boolean;
  shadowless: boolean;
  promo: boolean;
  notes: string | null;
}

export interface SealedRow {
  id: string;
  item_id: string;
  name: string;
  set_name: string | null;
  language: string | null;
  year: number | null;
  product_type: string;
  quantity: number;
  package_condition: string | null;
  sealed_status: string | null;
  notes: string | null;
}

export interface ImageRow {
  id: string;
  item_id: string;
  image_type: "FRONT" | "BACK" | "EXTRA";
  url: string;
  storage_path: string | null;
  caption: string | null;
  created_at: string;
}

export interface ConditionRow {
  id: string;
  item_id: string;
  overall_condition: string | null;
  centering_front: string | null;
  centering_back: string | null;
  surface_front: string | null;
  surface_back: string | null;
  edges: string | null;
  corners: string | null;
  whitening: string | null;
  scratches: string | null;
  print_lines: string | null;
  dents: string | null;
  creases: string | null;
  stains: string | null;
  notes: string | null;
  created_at: string;
}

export interface GradingRow {
  id: string;
  item_id: string;
  grading_company: string;
  min_grade: number | null;
  probable_grade: number | null;
  max_grade: number | null;
  prob_psa1: number;
  prob_psa2: number;
  prob_psa3: number;
  prob_psa4: number;
  prob_psa5: number;
  prob_psa6: number;
  prob_psa7: number;
  prob_psa8: number;
  prob_psa9: number;
  prob_psa10: number;
  confidence: number | null;
  recommendation: string | null;
  grading_cost: number | null;
  notes: string | null;
  actual_company: string | null;
  actual_grade: number | null;
  certificate_number: string | null;
  submitted_at: string | null;
  graded_at: string | null;
  returned_at: string | null;
  actual_grading_cost: number | null;
  result_notes: string | null;
  created_at: string;
}

export interface PriceRow {
  id: string;
  item_id: string;
  price_type: PriceType;
  value: number;
  currency: string;
  source: string | null;
  observed_at: string;
}

export interface PurchaseRow {
  id: string;
  user_id: string | null;
  is_demo: boolean;
  purchase_date: string;
  platform: string | null;
  seller: string | null;
  item_price: number;
  shipping: number;
  fees: number;
  taxes: number;
  total_cost: number;
  currency: string;
  notes: string | null;
}

export interface SaleRow {
  id: string;
  user_id: string | null;
  is_demo: boolean;
  sale_date: string;
  platform: string | null;
  buyer: string | null;
  gross_revenue: number;
  shipping: number;
  fees: number;
  taxes: number;
  net_revenue: number;
  currency: string;
  notes: string | null;
}

export interface PurchaseItemRow {
  id: string;
  purchase_id: string;
  item_id: string;
  allocated_cost: number;
  purchases: PurchaseRow | null;
}

export interface SaleItemRow {
  id: string;
  sale_id: string;
  item_id: string;
  allocated_revenue: number;
  sales: SaleRow | null;
}

export interface ItemRow {
  id: string;
  user_id: string | null;
  item_type: ItemType;
  status: ItemStatus;
  is_demo: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
  cards: CardRow[];
  sealed_products: SealedRow[];
  card_images: ImageRow[];
  condition_assessments: ConditionRow[];
  grading_assessments: GradingRow[];
  market_prices: PriceRow[];
  purchase_items: PurchaseItemRow[];
  sale_items: SaleItemRow[];
}

export type CardInput = {
  pokemon_name: string;
  card_name: string;
  set_name: string | null;
  set_code: string | null;
  card_number: string | null;
  set_total: string | null;
  year: number | null;
  language: string | null;
  rarity: string | null;
  variant: string | null;
  holo: boolean;
  reverse_holo: boolean;
  first_edition: boolean;
  unlimited: boolean;
  shadowless: boolean;
  promo: boolean;
};

export type SealedInput = {
  name: string;
  set_name: string | null;
  language: string | null;
  year: number | null;
  product_type: string;
  quantity: number;
  package_condition: string | null;
  sealed_status: string | null;
};

export type PurchaseInput = {
  purchase_date: string;
  platform: string;
  seller: string;
  item_price: number;
  shipping: number;
  fees: number;
  taxes: number;
  notes: string;
};

export type SaleInput = {
  itemId: string;
  sale_date: string;
  platform: string;
  buyer: string;
  gross_revenue: number;
  shipping: number;
  fees: number;
  taxes: number;
  notes: string;
};

export function getCard(item: ItemRow): CardRow | null {
  return item.cards[0] ?? null;
}

export function getSealedProduct(item: ItemRow): SealedRow | null {
  return item.sealed_products[0] ?? null;
}

export function getLatestCondition(item: ItemRow): ConditionRow | null {
  if (!item.condition_assessments.length) return null;
  return (
    [...item.condition_assessments].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    )[0] ?? null
  );
}

export function getLatestGrading(item: ItemRow): GradingRow | null {
  if (!item.grading_assessments.length) return null;
  return (
    [...item.grading_assessments].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    )[0] ?? null
  );
}

export function getLatestPrice(item: ItemRow, priceType: PriceType): PriceRow | null {
  const prices = item.market_prices
    .filter((price) => price.price_type === priceType)
    .sort((a, b) => new Date(b.observed_at).getTime() - new Date(a.observed_at).getTime());
  return prices[0] ?? null;
}

export function getCurrentRawValue(item: ItemRow): number | null {
  return getLatestPrice(item, "RAW")?.value ?? null;
}

export function getCurrentSealedValue(item: ItemRow): number | null {
  return getLatestPrice(item, "SEALED")?.value ?? null;
}

export function getPurchaseCost(item: ItemRow): number | null {
  if (!item.purchase_items.length) return null;
  const purchases = [...item.purchase_items].sort((a, b) => {
    const dateA = a.purchases?.purchase_date ? new Date(a.purchases.purchase_date).getTime() : 0;
    const dateB = b.purchases?.purchase_date ? new Date(b.purchases.purchase_date).getTime() : 0;
    return dateB - dateA;
  });
  return purchases[0]?.allocated_cost ?? null;
}

export function getTotalPurchaseCost(item: ItemRow): number {
  return item.purchase_items.reduce(
    (total, purchase) => total + Number(purchase.allocated_cost || 0),
    0,
  );
}

export function getSaleRevenue(item: ItemRow): number | null {
  if (!item.sale_items.length) return null;
  const sales = [...item.sale_items].sort((a, b) => {
    const dateA = a.sales?.sale_date ? new Date(a.sales.sale_date).getTime() : 0;
    const dateB = b.sales?.sale_date ? new Date(b.sales.sale_date).getTime() : 0;
    return dateB - dateA;
  });
  return sales[0]?.allocated_revenue ?? null;
}

export function getTotalSaleRevenue(item: ItemRow): number {
  return item.sale_items.reduce((total, sale) => total + Number(sale.allocated_revenue || 0), 0);
}

export function getFrontImage(item: ItemRow): ImageRow | null {
  return (
    [...item.card_images]
      .filter((image) => image.image_type === "FRONT")
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0] ??
    null
  );
}

export function getBackImage(item: ItemRow): ImageRow | null {
  return (
    [...item.card_images]
      .filter((image) => image.image_type === "BACK")
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0] ??
    null
  );
}

export function getExtraImages(item: ItemRow): ImageRow[] {
  return [...item.card_images]
    .filter((image) => image.image_type === "EXTRA")
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
}

/**
 * Immagine di copertina: la foto "extra" (scatto sul cavalletto) è la principale.
 * Fallback additivo e retrocompatibile: front, back, poi la prima immagine disponibile.
 */
export function getCoverImage(item: ItemRow): ImageRow | null {
  return (
    getExtraImages(item)[0] ??
    getFrontImage(item) ??
    getBackImage(item) ??
    [...item.card_images].sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
    )[0] ??
    null
  );
}


export function getItemName(item: ItemRow): string {
  if (item.item_type === "CARD") {
    const card = getCard(item);
    return card?.card_name || card?.pokemon_name || "Carta senza nome";
  }
  const sealed = getSealedProduct(item);
  const name = sealed?.name?.trim();
  if (name) return name;
  const fallback = [sealed?.set_name, sealed?.product_type].filter(Boolean).join(" — ");
  return fallback || "Prodotto sealed senza nome";
}


export function calculateUnrealizedProfit(item: ItemRow): number | null {
  const cost = getTotalPurchaseCost(item);
  const currentValue =
    item.item_type === "CARD" ? getCurrentRawValue(item) : getCurrentSealedValue(item);
  if (currentValue === null) return null;
  return currentValue - cost;
}

export function calculateRealizedProfit(item: ItemRow): number | null {
  if (!item.sale_items.length) return null;
  return getTotalSaleRevenue(item) - getTotalPurchaseCost(item);
}

export function calculateRoi(profit: number, totalCost: number): number | null {
  if (totalCost <= 0) return null;
  return (profit / totalCost) * 100;
}

export function formatCurrency(value: number | null | undefined, currency = "EUR"): string {
  if (value === null || value === undefined) return "—";
  return new Intl.NumberFormat("it-IT", { style: "currency", currency }).format(value);
}
