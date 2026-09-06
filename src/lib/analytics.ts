import {
  currentValue,
  latestCondition,
  latestPrice,
  priceHistory,
  totalCost,
} from "./calc";
import {
  getCardGrade,
  getCoverImage,
  getLatestDecision,
  gradedPriceType,
  isGradedCard,
  type ItemRow,
  type PriceRow,
  type PriceType,
} from "./types";

/** Oltre queste ore un prezzo è considerato non aggiornato. */
export const STALE_HOURS = 48;

export type FreshnessStatus = "FRESH" | "STALE" | "NEVER";

/** Tipo di prezzo che rappresenta il valore corrente dell'oggetto (mai un raw generico per gli slab). */
export function valuePriceType(item: ItemRow): PriceType | null {
  if (item.item_type === "SEALED") return "SEALED";
  if (isGradedCard(item)) return gradedPriceType(getCardGrade(item));
  return "RAW";
}

export function latestValuePrice(item: ItemRow): PriceRow | null {
  const type = valuePriceType(item);
  return type ? latestPrice(item, type) : null;
}

export interface Freshness {
  status: FreshnessStatus;
  row: PriceRow | null;
  ageHours: number | null;
  label: string;
}

export function priceFreshness(item: ItemRow): Freshness {
  const row = latestValuePrice(item);
  if (!row) return { status: "NEVER", row: null, ageHours: null, label: "MAI PREZZATA" };
  const ageHours = (Date.now() - +new Date(row.observed_at)) / 3_600_000;
  return {
    status: ageHours > STALE_HOURS ? "STALE" : "FRESH",
    row,
    ageHours,
    label: ageHours > STALE_HOURS ? "STALE" : "AGGIORNATO",
  };
}

export function formatObservedAt(row: PriceRow | null): string {
  if (!row) return "Mai prezzata";
  return new Date(row.observed_at).toLocaleString("it-IT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export interface Change {
  abs: number;
  pct: number | null;
  from: PriceRow;
  to: PriceRow;
}

/** Variazione tra le due rilevazioni più recenti dello stesso tipo di prezzo. */
export function priceChange(item: ItemRow): Change | null {
  const type = valuePriceType(item);
  if (!type) return null;
  const rows = priceHistory(item, type);
  if (rows.length < 2) return null;
  const to = rows[rows.length - 1]!;
  const from = rows[rows.length - 2]!;
  const abs = Number(to.value) - Number(from.value);
  const base = Number(from.value);
  return { abs, pct: base > 0 ? (abs / base) * 100 : null, from, to };
}

export interface MoverRow {
  item: ItemRow;
  change: Change;
}

export function movers(items: ItemRow[], limit = 5): { gainers: MoverRow[]; losers: MoverRow[] } {
  const rows: MoverRow[] = [];
  for (const item of items) {
    if (item.status === "SOLD") continue;
    const change = priceChange(item);
    if (change && change.abs !== 0) rows.push({ item, change });
  }
  const sorted = [...rows].sort((a, b) => b.change.abs - a.change.abs);
  return {
    gainers: sorted.filter((r) => r.change.abs > 0).slice(0, limit),
    losers: sorted
      .filter((r) => r.change.abs < 0)
      .sort((a, b) => a.change.abs - b.change.abs)
      .slice(0, limit),
  };
}

export interface Segments {
  raw: number;
  slab: number;
  sealed: number;
  total: number;
  cost: number;
  profitLoss: number;
  count: number;
}

export function segmentValues(items: ItemRow[]): Segments {
  const owned = items.filter((i) => i.status !== "SOLD");
  let raw = 0;
  let slab = 0;
  let sealed = 0;
  for (const item of owned) {
    const v = currentValue(item);
    if (item.item_type === "SEALED") sealed += v;
    else if (isGradedCard(item)) slab += v;
    else raw += v;
  }
  const cost = owned.reduce((s, i) => s + totalCost(i), 0);
  const total = raw + slab + sealed;
  return { raw, slab, sealed, total, cost, profitLoss: total - cost, count: owned.length };
}

export interface Incomplete {
  item: ItemRow;
  missing: string[];
}

/** Elenco dei dati mancanti: mai valori inventati, solo segnalazioni. */
export function incompleteItems(items: ItemRow[]): Incomplete[] {
  const rows: Incomplete[] = [];
  for (const item of items) {
    if (item.status === "SOLD") continue;
    const missing: string[] = [];
    if (totalCost(item) <= 0) missing.push("costo acquisto");
    if (!latestValuePrice(item)) missing.push("prezzo di mercato");
    if (!getCoverImage(item)) missing.push("foto");
    if (item.item_type === "CARD" && !latestCondition(item)) missing.push("condizione");
    if (!getLatestDecision(item)) missing.push("strategia");
    if (missing.length) rows.push({ item, missing });
  }
  return rows.sort((a, b) => b.missing.length - a.missing.length);
}

export type AlertLevel = "INFO" | "WARN" | "GOOD";

export interface AlertRow {
  id: string;
  item: ItemRow;
  level: AlertLevel;
  title: string;
  detail: string;
}

/** Soglia percentuale oltre la quale un movimento di prezzo è considerato rilevante. */
export const MOVE_THRESHOLD_PCT = 10;

export function buildAlerts(items: ItemRow[]): AlertRow[] {
  const alerts: AlertRow[] = [];
  for (const item of items) {
    if (item.status === "SOLD") continue;
    const value = currentValue(item);
    const decision = getLatestDecision(item);
    const change = priceChange(item);

    if (change?.pct != null && Math.abs(change.pct) >= MOVE_THRESHOLD_PCT) {
      alerts.push({
        id: `${item.id}-move`,
        item,
        level: change.pct > 0 ? "GOOD" : "WARN",
        title: change.pct > 0 ? "Prezzo in forte rialzo" : "Prezzo in forte calo",
        detail: `${change.pct > 0 ? "+" : ""}${change.pct.toFixed(1)}% rispetto alla rilevazione precedente`,
      });
    }

    if (decision?.buy_it_now_price && value > 0 && value >= Number(decision.buy_it_now_price)) {
      alerts.push({
        id: `${item.id}-target`,
        item,
        level: "GOOD",
        title: "Target di vendita raggiunto",
        detail: `Valore corrente al di sopra del Buy It Now impostato`,
      });
    }

    if (
      decision?.min_acceptable_price &&
      value > 0 &&
      value < Number(decision.min_acceptable_price)
    ) {
      alerts.push({
        id: `${item.id}-min`,
        item,
        level: "WARN",
        title: "Sotto il minimo accettabile",
        detail: `Valore corrente inferiore al minimo impostato`,
      });
    }

    const fresh = priceFreshness(item);
    if (fresh.status === "STALE") {
      alerts.push({
        id: `${item.id}-stale`,
        item,
        level: "INFO",
        title: "Prezzo non aggiornato",
        detail: `Ultimo aggiornamento oltre ${STALE_HOURS} ore fa`,
      });
    }
  }
  return alerts;
}
