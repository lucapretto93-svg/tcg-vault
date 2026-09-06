import {
  currentValue,
  expectedUplift,
  gradingCost,
  latestGrading,
  totalCost,
} from "./calc";
import { priceChange, priceFreshness } from "./analytics";
import { getLatestDecision, isGradedCard, type ItemRow } from "./types";

/** Tipo di azione consigliata su un oggetto della collezione. */
export type MoveKind = "GRADE" | "SELL";

export interface MoveRow {
  item: ItemRow;
  kind: MoveKind;
  /** Motivo leggibile in italiano, sempre basato su dati reali già presenti. */
  reason: string;
  /** Guadagno atteso in euro (uplift di grading o profitto latente sulla vendita). */
  gain: number;
  value: number;
  /** Priorità: guadagno atteso, usata per l'ordinamento. */
  priority: number;
  stale: boolean;
}

export const MOVE_LABELS: Record<MoveKind, string> = {
  GRADE: "Da gradare",
  SELL: "Da vendere",
};

/**
 * Costruisce la lista delle carte "da muovere": prima quelle con il guadagno
 * atteso più alto. Non inventa prezzi: se manca il dato, l'oggetto non entra.
 */
export function buildMoves(items: ItemRow[]): MoveRow[] {
  const rows: MoveRow[] = [];

  for (const item of items) {
    if (item.status === "SOLD") continue;
    const value = currentValue(item);
    const cost = totalCost(item);
    const decision = getLatestDecision(item);
    const grading = latestGrading(item);
    const change = priceChange(item);
    const stale = priceFreshness(item).status !== "FRESH";

    // 1) Grading: solo carte raw con un uplift atteso positivo e reale.
    if (item.item_type === "CARD" && !isGradedCard(item)) {
      const uplift = expectedUplift(item);
      if (uplift > 0) {
        const reasons: string[] = [];
        if (grading?.recommendation === "GRADA") reasons.push("valutazione consiglia il grading");
        if (grading?.probable_grade != null) reasons.push(`grade probabile ${grading.probable_grade}`);
        if (gradingCost(item) > 0) reasons.push(`costo grading ${gradingCost(item).toFixed(0)} €`);
        rows.push({
          item,
          kind: "GRADE",
          reason: reasons.length ? reasons.join(" · ") : "uplift atteso positivo dopo il grading",
          gain: uplift,
          value,
          priority: uplift,
          stale,
        });
      }
    }

    // 2) Vendita: strategia SELL, target raggiunto, stock o forte rialzo.
    const profit = value - cost;
    const sellReasons: string[] = [];
    if (decision?.decision === "SELL") sellReasons.push("strategia impostata su vendere");
    if (decision?.buy_it_now_price && value > 0 && value >= Number(decision.buy_it_now_price)) {
      sellReasons.push("target di vendita raggiunto");
    }
    if (item.bucket === "STOCK" && value > 0) sellReasons.push("in stock da rivendere");
    if (change?.pct != null && change.pct >= 10) {
      sellReasons.push(`prezzo +${change.pct.toFixed(1)}% sull'ultima rilevazione`);
    }
    if (sellReasons.length && value > 0) {
      rows.push({
        item,
        kind: "SELL",
        reason: sellReasons.join(" · "),
        gain: profit,
        value,
        // Una vendita in profitto pesa più di un semplice riposizionamento.
        priority: profit > 0 ? profit : value * 0.05,
        stale,
      });
    }
  }

  return rows.sort((a, b) => b.priority - a.priority);
}

export function filterMoves(rows: MoveRow[], kind: MoveKind | "ALL", search: string): MoveRow[] {
  const q = search.trim().toLowerCase();
  return rows.filter((row) => {
    if (kind !== "ALL" && row.kind !== kind) return false;
    if (!q) return true;
    const haystack = [
      row.item.cards[0]?.pokemon_name,
      row.item.cards[0]?.card_name,
      row.item.cards[0]?.set_name,
      row.item.cards[0]?.card_number,
      row.item.sealed_products[0]?.name,
      row.item.sealed_products[0]?.set_name,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return haystack.includes(q);
  });
}
