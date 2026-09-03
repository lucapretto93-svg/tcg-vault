import type { GradingRow, ItemRow, PriceRow, PriceType } from "./types";

export function latestPrice(item: ItemRow, type: PriceType): PriceRow | null {
  const rows = item.market_prices
    .filter((p) => p.price_type === type)
    .sort((a, b) => +new Date(b.observed_at) - +new Date(a.observed_at));
  return rows[0] ?? null;
}

export function priceHistory(item: ItemRow, type?: PriceType): PriceRow[] {
  return item.market_prices
    .filter((p) => (type ? p.price_type === type : true))
    .sort((a, b) => +new Date(a.observed_at) - +new Date(b.observed_at));
}

export function latestGrading(item: ItemRow): GradingRow | null {
  const rows = [...item.grading_assessments].sort(
    (a, b) => +new Date(b.created_at) - +new Date(a.created_at),
  );
  return rows[0] ?? null;
}

export function latestCondition(item: ItemRow) {
  const rows = [...item.condition_assessments].sort(
    (a, b) => +new Date(b.created_at) - +new Date(a.created_at),
  );
  return rows[0] ?? null;
}

export function itemTitle(item: ItemRow): string {
  if (item.item_type === "CARD") {
    const c = item.cards[0];
    if (!c) return "Carta senza nome";
    return [c.pokemon_name, c.card_name].filter(Boolean).join(" — ") || "Carta senza nome";
  }
  return item.sealed_products[0]?.name || "Prodotto sealed";
}

export function itemSubtitle(item: ItemRow): string {
  if (item.item_type === "CARD") {
    const c = item.cards[0];
    if (!c) return "";
    const num = c.card_number ? `#${c.card_number}${c.set_total ? `/${c.set_total}` : ""}` : "";
    return [c.set_name, num, c.year ?? "", c.language ?? ""].filter(Boolean).join(" · ");
  }
  const s = item.sealed_products[0];
  if (!s) return "";
  return [s.product_type, s.set_name, s.year ?? "", s.language ?? ""].filter(Boolean).join(" · ");
}

export function quantity(item: ItemRow): number {
  return item.item_type === "SEALED" ? (item.sealed_products[0]?.quantity ?? 1) : 1;
}

export function totalCost(item: ItemRow): number {
  return item.purchase_items.reduce((sum, pi) => sum + Number(pi.allocated_cost || 0), 0);
}

export function netRevenue(item: ItemRow): number {
  return item.sale_items.reduce((sum, si) => sum + Number(si.allocated_revenue || 0), 0);
}

export function currentValue(item: ItemRow): number {
  if (item.item_type === "SEALED") {
    return Number(latestPrice(item, "SEALED")?.value ?? 0) * quantity(item);
  }
  return Number(latestPrice(item, "RAW")?.value ?? 0);
}

export function expectedGradedValue(item: ItemRow): number {
  const g = latestGrading(item);
  if (!g) return 0;
  const pairs: [PriceType, number][] = [
    ["PSA1", Number(g.prob_psa1)],
    ["PSA2", Number(g.prob_psa2)],
    ["PSA3", Number(g.prob_psa3)],
    ["PSA4", Number(g.prob_psa4)],
    ["PSA5", Number(g.prob_psa5)],
    ["PSA6", Number(g.prob_psa6)],
    ["PSA7", Number(g.prob_psa7)],
    ["PSA8", Number(g.prob_psa8)],
    ["PSA9", Number(g.prob_psa9)],
    ["PSA10", Number(g.prob_psa10)],
  ];
  return pairs.reduce((sum, [type, prob]) => {
    const v = Number(latestPrice(item, type)?.value ?? 0);
    return sum + (prob / 100) * v;
  }, 0);
}

export function gradingCost(item: ItemRow): number {
  return Number(latestGrading(item)?.grading_cost ?? 0);
}

export function expectedUplift(item: ItemRow): number {
  const egv = expectedGradedValue(item);
  if (!egv) return 0;
  return egv - currentValue(item) - gradingCost(item);
}

export function expectedProfit(item: ItemRow): number {
  const egv = expectedGradedValue(item);
  if (!egv) return 0;
  return egv - totalCost(item) - gradingCost(item);
}

export function realizedProfit(item: ItemRow): number {
  if (item.status !== "SOLD") return 0;
  return netRevenue(item) - totalCost(item);
}

export function unrealizedProfit(item: ItemRow): number {
  if (item.status === "SOLD") return 0;
  return currentValue(item) - totalCost(item);
}

export function roi(item: ItemRow): number | null {
  const cost = totalCost(item);
  if (!cost) return null;
  const profit = item.status === "SOLD" ? realizedProfit(item) : unrealizedProfit(item);
  return (profit / cost) * 100;
}

export interface Portfolio {
  cardCount: number;
  sealedCount: number;
  invested: number;
  currentValue: number;
  realized: number;
  unrealized: number;
  roi: number;
  toGrade: ItemRow[];
  topByValue: ItemRow[];
  topByRoi: ItemRow[];
}

export function buildPortfolio(items: ItemRow[]): Portfolio {
  const owned = items.filter((i) => i.status !== "SOLD");
  const sold = items.filter((i) => i.status === "SOLD");

  const invested = items.reduce((s, i) => s + totalCost(i), 0);
  const value = owned.reduce((s, i) => s + currentValue(i), 0);
  const realized = sold.reduce((s, i) => s + realizedProfit(i), 0);
  const unrealized = owned.reduce((s, i) => s + unrealizedProfit(i), 0);

  const toGrade = owned.filter((i) => {
    const g = latestGrading(i);
    if (g?.recommendation === "GRADA") return true;
    return expectedUplift(i) > 0;
  });

  return {
    cardCount: owned.filter((i) => i.item_type === "CARD").length,
    sealedCount: owned.filter((i) => i.item_type === "SEALED").reduce((s, i) => s + quantity(i), 0),
    invested,
    currentValue: value,
    realized,
    unrealized,
    roi: invested ? ((realized + unrealized) / invested) * 100 : 0,
    toGrade,
    topByValue: [...owned].sort((a, b) => currentValue(b) - currentValue(a)).slice(0, 5),
    topByRoi: [...items]
      .filter((i) => totalCost(i) > 0)
      .sort((a, b) => (roi(b) ?? -Infinity) - (roi(a) ?? -Infinity))
      .slice(0, 5),
  };
}

export function eur(n: number | null | undefined): string {
  return new Intl.NumberFormat("it-IT", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 2,
  }).format(Number(n ?? 0));
}

export function pct(n: number | null | undefined): string {
  if (n === null || n === undefined || Number.isNaN(n)) return "—";
  return `${n > 0 ? "+" : ""}${n.toFixed(1)}%`;
}

export function dateIt(d: string | null | undefined): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("it-IT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}
