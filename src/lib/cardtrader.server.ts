/**
 * Client server-only per l'API ufficiale CardTrader (https://api.cardtrader.com/api/v2).
 *
 * Regole:
 * - il token vive SOLO qui, letto da process.env dentro le funzioni: mai nel bundle client,
 *   mai in localStorage, mai nel DB, mai nei log.
 * - nessun prezzo inventato: il benchmark è la mediana reale delle altre offerte
 *   della STESSA carta, STESSA lingua e STESSA condizione.
 */

const API_BASE = "https://api.cardtrader.com/api/v2";

export const CONDITION_ORDER = [
  "Mint",
  "Near Mint",
  "Slightly Played",
  "Moderately Played",
  "Played",
  "Heavily Played",
  "Poor",
] as const;

export type CardtraderCondition = (typeof CONDITION_ORDER)[number];

export function conditionRank(condition: string | null | undefined): number {
  if (!condition) return CONDITION_ORDER.length;
  const index = CONDITION_ORDER.findIndex(
    (value) => value.toLowerCase() === condition.trim().toLowerCase(),
  );
  return index === -1 ? CONDITION_ORDER.length : index;
}

export function hasCardtraderToken(): boolean {
  return !!process.env["CARDTRADER_API_TOKEN"];
}

async function ctFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const token = process.env["CARDTRADER_API_TOKEN"];
  if (!token) throw new Error("CARDTRADER_NOT_CONFIGURED");
  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  const text = await response.text();
  if (!response.ok) {
    throw new Error(`CardTrader ${response.status}: ${text.slice(0, 300)}`);
  }
  return (text ? JSON.parse(text) : null) as T;
}

export type CtInfo = { id?: number; name?: string; email?: string };

export async function ctInfo(): Promise<CtInfo> {
  return ctFetch<CtInfo>("/info");
}

export type CtExpansion = { id: number; code: string; name: string; game_id: number };

export async function ctExpansions(): Promise<CtExpansion[]> {
  return ctFetch<CtExpansion[]>("/expansions");
}

export type CtProduct = {
  id: number;
  blueprint_id: number;
  name_en?: string;
  quantity?: number;
  price?: { cents?: number; currency?: string };
  price_cents?: number;
  price_currency?: string;
  on_vacation?: boolean;
  description?: string;
  properties_hash?: Record<string, unknown>;
  expansion?: { id?: number; code?: string; name_en?: string };
  user?: {
    id?: number;
    username?: string;
    country_code?: string;
    can_sell_via_hub?: boolean;
    can_sell_sealed_with_ct_zero?: boolean;
  };
};

export async function ctMarketplaceByExpansion(expansionId: number): Promise<CtProduct[]> {
  const payload = await ctFetch<Record<string, CtProduct[]>>(
    `/marketplace/products?expansion_id=${expansionId}`,
  );
  return Object.values(payload ?? {}).flat();
}

export function productPrice(product: CtProduct): number {
  const cents = product.price?.cents ?? product.price_cents ?? 0;
  return Math.round(cents) / 100;
}

export function productCurrency(product: CtProduct): string {
  return product.price?.currency ?? product.price_currency ?? "EUR";
}

export function productCondition(product: CtProduct): string | null {
  const value = product.properties_hash?.["condition"];
  return typeof value === "string" ? value : null;
}

export function productLanguage(product: CtProduct): string | null {
  const props = product.properties_hash ?? {};
  const value = props["pokemon_language"] ?? props["mtg_language"] ?? props["language"];
  return typeof value === "string" ? value : null;
}

export function productFoil(product: CtProduct): boolean {
  const props = product.properties_hash ?? {};
  return props["pokemon_reverse"] === true || props["mtg_foil"] === true || props["foil"] === true;
}

export function productNumber(product: CtProduct): string | null {
  const value = product.properties_hash?.["collector_number"];
  return typeof value === "string" || typeof value === "number" ? String(value) : null;
}

export function isZeroEligible(product: CtProduct): boolean {
  return product.user?.can_sell_via_hub === true;
}

export function median(values: number[]): number | null {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  const low = sorted[mid - 1];
  const high = sorted[mid];
  if (sorted.length % 2 === 0 && low !== undefined && high !== undefined) return (low + high) / 2;
  return high ?? null;
}

export function dealUrl(product: CtProduct): string {
  return `https://www.cardtrader.com/cards/${product.blueprint_id}`;
}

/** Punteggio 0-100: sconto reale, qualità della condizione dichiarata e liquidità del listing. */
export function computeDealScore(input: {
  discountPct: number;
  condition: string | null;
  competingListings: number;
  zeroEligible: boolean;
}): { dealScore: number; qualityScore: number; liquidityScore: number } {
  const discountPart = Math.max(0, Math.min(60, (input.discountPct / 60) * 60));
  const rank = conditionRank(input.condition);
  const qualityScore = Math.max(0, 100 - rank * 18);
  const liquidityScore = Math.max(0, Math.min(100, input.competingListings * 8));
  const qualityPart = (qualityScore / 100) * 25;
  const liquidityPart = (liquidityScore / 100) * 10;
  const hubPart = input.zeroEligible ? 5 : 0;
  return {
    dealScore: Math.round(discountPart + qualityPart + liquidityPart + hubPart),
    qualityScore: Math.round(qualityScore),
    liquidityScore: Math.round(liquidityScore),
  };
}

/** Notifica Telegram: attiva solo se i secret sono configurati, altrimenti no-op onesto. */
export async function sendTelegram(message: string): Promise<boolean> {
  const token = process.env["TELEGRAM_BOT_TOKEN"];
  const chatId = process.env["TELEGRAM_CHAT_ID"];
  if (!token || !chatId) return false;
  try {
    const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text: message, disable_web_page_preview: false }),
    });
    return response.ok;
  } catch {
    return false;
  }
}

/** Crea/aggiorna/rimuove inserzioni sull'account venditore CardTrader. */
export async function ctCreateProduct(
  body: Record<string, unknown>,
): Promise<{ id: number | undefined }> {
  const result = await ctFetch<{ id?: number; resource?: { id?: number } }>("/products", {
    method: "POST",
    body: JSON.stringify(body),
  });
  return { id: result?.id ?? result?.resource?.id };
}

export async function ctUpdateProduct(id: string, body: Record<string, unknown>): Promise<void> {
  await ctFetch(`/products/${id}`, { method: "PUT", body: JSON.stringify(body) });
}

export async function ctDeleteProduct(id: string): Promise<void> {
  await ctFetch(`/products/${id}`, { method: "DELETE" });
}

export async function ctBlueprints(expansionId: number): Promise<
  { id: number; name: string; expansion_id: number; fixed_properties?: Record<string, unknown>; image_url?: string }[]
> {
  return ctFetch(`/blueprints/export?expansion_id=${expansionId}`);
}

export type CtGame = { id: number; name: string; display_name?: string };

export async function ctGames(): Promise<CtGame[]> {
  return ctFetch<CtGame[]>("/games");
}
