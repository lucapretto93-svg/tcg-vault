import {
  currentValue,
  expectedGradedValue,
  gradingCost,
  latestCondition,
  latestGrading,
  totalCost,
} from "./calc";
import { latestValuePrice, priceChange, priceFreshness } from "./analytics";
import { buildSetProgress, completionCost, type SetGroup } from "./setProgress";
import {
  getBackImage,
  getCard,
  getCoverImage,
  getFrontImage,
  getLatestDecision,
  gradedPriceType,
  isGradedCard,
  type ItemRow,
  type PriceType,
} from "./types";
import { latestPrice } from "./calc";

export const MAX_ROWS = 10;

export interface PriorityRow {
  item: ItemRow;
  score: number;
  reasons: string[];
  /** Valore economico da mostrare a destra (uplift, margine, valore). */
  amount: number | null;
  amountLabel: string;
}

function isOwned(item: ItemRow): boolean {
  return item.status !== "SOLD";
}

function qcCompleted(item: ItemRow): boolean {
  return item.qc_status === "completed";
}

function isVintage(item: ItemRow): boolean {
  const year = getCard(item)?.year;
  return year != null && year <= 2003;
}

function isSpecial(item: ItemRow): boolean {
  const c = getCard(item);
  if (!c) return false;
  return Boolean(c.holo || c.reverse_holo || c.first_edition || c.promo || c.rarity);
}

/* ------------------------------------------------------------------ */
/* 1. QUALITY CHECK                                                     */
/* ------------------------------------------------------------------ */

export function buildQualityCheck(items: ItemRow[], limit = MAX_ROWS): PriorityRow[] {
  const rows: PriorityRow[] = [];

  for (const item of items) {
    if (!isOwned(item) || qcCompleted(item)) continue;

    const reasons: string[] = [];
    let score = 0;
    const card = getCard(item);
    const value = currentValue(item);

    const notes = `${item.notes ?? ""} ${item.qc_notes ?? ""} ${
      getLatestDecision(item)?.rationale ?? ""
    }`.toUpperCase();
    if (notes.includes("DA RIVEDERE")) {
      score += 50;
      reasons.push("segnata DA RIVEDERE");
    }

    if (!getCoverImage(item)) {
      score += 25;
      reasons.push("nessuna foto caricata");
    } else if (item.item_type === "CARD" && (!getFrontImage(item) || !getBackImage(item))) {
      score += 18;
      reasons.push("mancano foto fronte/retro");
    }

    if (item.item_type === "CARD" && !latestCondition(item)) {
      score += 15;
      reasons.push("condizione non registrata");
    }

    if (!latestValuePrice(item)) {
      score += 15;
      reasons.push("valore di mercato assente");
    } else if (priceFreshness(item).status === "STALE") {
      score += 6;
      reasons.push("prezzo non aggiornato");
    }

    if (card) {
      const missing: string[] = [];
      if (!card.set_name?.trim()) missing.push("set");
      if (!card.card_number?.trim()) missing.push("numero");
      if (!card.language?.trim()) missing.push("lingua");
      if (!card.variant?.trim() && !card.holo && !card.reverse_holo && !card.promo) {
        missing.push("variante");
      }
      if (missing.length) {
        score += 6 * missing.length;
        reasons.push(`dati incerti: ${missing.join(", ")}`);
      }
    }

    if (value > 0) {
      score += Math.min(30, value / 10);
      if (value >= 50) reasons.push(`alto valore potenziale (${Math.round(value)} €)`);
    }

    if (isVintage(item)) {
      score += 12;
      reasons.push("vintage");
    }
    if (isSpecial(item)) {
      score += 6;
      reasons.push("holo/rara");
    }

    const grading = latestGrading(item);
    if (item.item_type === "CARD" && !isGradedCard(item)) {
      if (grading?.recommendation === "GRADA" || (isVintage(item) && value >= 20)) {
        score += 14;
        reasons.push("potenziale candidata al grading");
      }
    }

    const decision = getLatestDecision(item);
    if (decision?.decision === "SELL") {
      score += 10;
      reasons.push("strategia vendita: serve stima affidabile");
    }

    if (reasons.length === 0) continue;

    rows.push({
      item,
      score,
      reasons,
      amount: value > 0 ? value : null,
      amountLabel: "Valore attuale",
    });
  }

  return rows.sort((a, b) => b.score - a.score).slice(0, limit);
}

/* ------------------------------------------------------------------ */
/* 2. GRADING                                                           */
/* ------------------------------------------------------------------ */

export interface GradingRowView extends PriorityRow {
  uplift: number;
  roi: number | null;
  bestGrade: number | null;
}

/** Grade plausibile più conveniente: probabilità > 0 e prezzo slab realmente presente. */
function bestPlausibleGrade(item: ItemRow): { grade: number; value: number; prob: number } | null {
  const g = latestGrading(item);
  if (!g) return null;
  const probs: [number, number][] = [
    [1, Number(g.prob_psa1)],
    [2, Number(g.prob_psa2)],
    [3, Number(g.prob_psa3)],
    [4, Number(g.prob_psa4)],
    [5, Number(g.prob_psa5)],
    [6, Number(g.prob_psa6)],
    [7, Number(g.prob_psa7)],
    [8, Number(g.prob_psa8)],
    [9, Number(g.prob_psa9)],
    [10, Number(g.prob_psa10)],
  ];
  let best: { grade: number; value: number; prob: number } | null = null;
  for (const [grade, prob] of probs) {
    if (!prob || prob <= 0) continue;
    const type = gradedPriceType(grade) as PriceType | null;
    const price = type ? Number(latestPrice(item, type)?.value ?? 0) : 0;
    if (price <= 0) continue;
    const weighted = (prob / 100) * price;
    if (!best || weighted > (best.prob / 100) * best.value) {
      best = { grade, value: price, prob };
    }
  }
  return best;
}

export function buildGradingPriority(items: ItemRow[], limit = MAX_ROWS): GradingRowView[] {
  const rows: GradingRowView[] = [];

  for (const item of items) {
    if (!isOwned(item) || !qcCompleted(item)) continue;
    if (item.item_type !== "CARD" || isGradedCard(item)) continue;

    const egv = expectedGradedValue(item);
    if (egv <= 0) continue; // nessuna stima reale: non si inventa

    const raw = currentValue(item);
    const cost = gradingCost(item);
    const uplift = egv - raw - cost;
    if (uplift <= 0) continue;

    const invested = totalCost(item) + cost;
    const roiPct = invested > 0 ? ((egv - invested) / invested) * 100 : null;

    const reasons: string[] = [];
    const g = latestGrading(item);
    const best = bestPlausibleGrade(item);
    if (raw > 0) reasons.push(`raw ${Math.round(raw)} €`);
    reasons.push(`slab atteso ${Math.round(egv)} €`);
    if (best) reasons.push(`grade più probabile PSA ${best.grade} (${Math.round(best.prob)}%)`);
    if (cost > 0) reasons.push(`costo grading ${Math.round(cost)} €`);
    if (g?.recommendation) reasons.push(g.recommendation.toLowerCase());
    if (isVintage(item)) reasons.push("vintage: lo slab aumenta liquidità anche a grade medio");

    const score = uplift + (isVintage(item) ? 10 : 0) + (roiPct ?? 0) / 10;

    rows.push({
      item,
      score,
      reasons,
      amount: uplift,
      amountLabel: "Uplift atteso",
      uplift,
      roi: roiPct,
      bestGrade: best?.grade ?? g?.probable_grade ?? null,
    });
  }

  return rows.sort((a, b) => b.score - a.score).slice(0, limit);
}

/* ------------------------------------------------------------------ */
/* 3. VENDITA                                                           */
/* ------------------------------------------------------------------ */

export interface SellRowView extends PriorityRow {
  suggestedPrice: number | null;
}

function setSignature(item: ItemRow): string | null {
  const c = getCard(item);
  if (!c) return null;
  const set = c.set_name?.trim().toLowerCase() || c.set_code?.trim().toLowerCase();
  const num = c.card_number?.trim().toLowerCase();
  if (!set || !num) return null;
  const variant = [c.reverse_holo ? "rev" : c.holo ? "holo" : "base", c.language ?? ""].join("-");
  return `${set}|${num}|${variant}`;
}

export function buildSellPriority(items: ItemRow[], limit = MAX_ROWS): SellRowView[] {
  const owned = items.filter(isOwned);

  // Doppioni reali: stessa carta, stesso numero, stessa variante e lingua.
  const counts = new Map<string, number>();
  for (const item of owned) {
    const sig = setSignature(item);
    if (sig) counts.set(sig, (counts.get(sig) ?? 0) + 1);
  }

  // Set personali incompleti: le copie uniche che li completano non si propongono.
  const groups = buildSetProgress(owned);
  const incompleteSets = new Set(
    groups.filter((g) => g.total && (g.percent ?? 0) < 100).map((g) => g.key),
  );
  const itemSetKey = new Map<string, string>();
  for (const g of groups) for (const i of g.items) itemSetKey.set(i.id, g.key);

  const rows: SellRowView[] = [];

  for (const item of owned) {
    if (!qcCompleted(item)) continue;

    const decision = getLatestDecision(item);
    const value = currentValue(item);
    const cost = totalCost(item);
    const margin = value - cost;
    const sig = setSignature(item);
    const duplicate = sig ? (counts.get(sig) ?? 0) > 1 : false;
    const explicitSell = decision?.decision === "SELL" || item.bucket === "STOCK";

    const key = itemSetKey.get(item.id);
    const neededForSet = !duplicate && key != null && incompleteSets.has(key);
    if (neededForSet && !explicitSell) continue; // serve a completare un set personale

    const reasons: string[] = [];
    let score = 0;

    if (decision?.decision === "SELL") {
      score += 60;
      reasons.push("strategia impostata su VENDI");
    }
    if (item.bucket === "STOCK") {
      score += 30;
      reasons.push("in stock da rivendere");
    }
    if (duplicate) {
      score += 35;
      reasons.push("doppione della stessa carta");
    }
    if (!key) {
      score += 8;
      reasons.push("fuori dai set tracciati");
    }
    if (decision?.buy_it_now_price && value > 0 && value >= Number(decision.buy_it_now_price)) {
      score += 40;
      reasons.push("target di vendita raggiunto");
    }
    const change = priceChange(item);
    if (change?.pct != null && change.pct >= 10) {
      score += 20;
      reasons.push(`mercato +${change.pct.toFixed(1)}% sull'ultima rilevazione`);
    }
    if (margin > 0) {
      score += Math.min(40, margin / 5);
      reasons.push(`margine +${Math.round(margin)} €`);
    }
    if (value >= 50) {
      score += 10;
      reasons.push(`capitale liberabile ${Math.round(value)} €`);
    }

    if (!reasons.length || value <= 0) continue;

    rows.push({
      item,
      score,
      reasons,
      amount: margin,
      amountLabel: "Margine",
      suggestedPrice: decision?.buy_it_now_price ? Number(decision.buy_it_now_price) : value || null,
    });
  }

  return rows.sort((a, b) => b.score - a.score).slice(0, limit);
}

/* ------------------------------------------------------------------ */
/* 4. ACQUISTO / COMPLETAMENTO SET                                      */
/* ------------------------------------------------------------------ */

export interface BuyRowView {
  key: string;
  group: SetGroup;
  number: string;
  percent: number;
  missing: number;
  targetPrice: number | null;
  score: number;
}

export function buildBuyPriority(items: ItemRow[], limit = MAX_ROWS): BuyRowView[] {
  const groups = buildSetProgress(items).filter(
    (g) => g.total && g.missingNumbers.length > 0 && (g.percent ?? 0) > 0,
  );

  const rows: BuyRowView[] = [];
  for (const group of groups) {
    const cost = completionCost(group);
    const percent = group.percent ?? 0;
    for (const number of group.missingNumbers) {
      rows.push({
        key: `${group.key}-${number}`,
        group,
        number,
        percent,
        missing: group.missingNumbers.length,
        targetPrice: cost.perCard,
        score: percent * 10 - group.missingNumbers.length - (cost.perCard ?? 0) / 20,
      });
    }
  }

  return rows.sort((a, b) => b.score - a.score).slice(0, limit);
}
