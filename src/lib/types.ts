export type ItemType = "CARD" | "SEALED";
export type ItemStatus = "OWNED" | "GRADING" | "LISTED" | "SOLD";
export type PriceType = "RAW" | "PSA6" | "PSA7" | "PSA8" | "PSA9" | "PSA10" | "SEALED";

export const PRICE_TYPES: PriceType[] = ["RAW", "PSA6", "PSA7", "PSA8", "PSA9", "PSA10", "SEALED"];
export const PSA_GRADES = [6, 7, 8, 9, 10] as const;

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
  prob_psa6: number;
  prob_psa7: number;
  prob_psa8: number;
  prob_psa9: number;
  prob_psa10: number;
  confidence: number | null;
  recommendation: string | null;
  grading_cost: number | null;
  notes: string | null;
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
