import type { ItemRow } from "./types";
import {
  currentValue,
  expectedGradedValue,
  itemSubtitle,
  itemTitle,
  latestGrading,
  netRevenue,
  quantity,
  roi,
  totalCost,
} from "./calc";
import {
  formatObservedAt,
  latestValuePrice,
  priceChange,
  priceFreshness,
  valuePriceType,
} from "./analytics";
import { getCardGrade, getCardGradingCompany, getCard, getLatestDecision, getSealedProduct, isGradedCard } from "./types";

function download(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

const stamp = () => new Date().toISOString().slice(0, 10);

/** Backup completo: righe originali + metriche calcolate, per ripristino o analisi esterna. */
export function exportJson(items: ItemRow[]) {
  const payload = {
    app: "TCG Vault",
    exported_at: new Date().toISOString(),
    version: 2,
    item_count: items.length,
    items: items.map((item) => ({
      raw: item,
      derived: {
        title: itemTitle(item),
        subtitle: itemSubtitle(item),
        bucket: item.bucket,
        value_price_type: valuePriceType(item),
        total_cost: totalCost(item),
        current_value: latestValuePrice(item) ? currentValue(item) : null,
        profit_loss: latestValuePrice(item) ? currentValue(item) - totalCost(item) : null,
        roi_percent: roi(item),
        price_observed_at: latestValuePrice(item)?.observed_at ?? null,
        price_freshness: priceFreshness(item).status,
        last_change: priceChange(item)?.abs ?? null,
        decision: getLatestDecision(item)?.decision ?? null,
        buy_it_now: getLatestDecision(item)?.buy_it_now_price ?? null,
        min_acceptable: getLatestDecision(item)?.min_acceptable_price ?? null,
      },
    })),
  };
  download(`tcg-vault-backup-${stamp()}.json`, JSON.stringify(payload, null, 2), "application/json");
}

const HEADERS = [
  "id",
  "tipo",
  "bucket",
  "stato",
  "titolo",
  "dettagli",
  "lingua",
  "set",
  "numero",
  "edizione",
  "stato_carta",
  "grading_company",
  "voto",
  "certificato",
  "quantita",
  "costo_totale",
  "tipo_prezzo_valore",
  "valore_corrente",
  "prezzo_aggiornato_il",
  "freschezza_prezzo",
  "variazione_ultima",
  "profit_loss",
  "roi_percento",
  "strategia",
  "buy_it_now",
  "minimo_accettabile",
  "expected_graded_value",
  "raccomandazione_grading",
  "ricavo_netto",
  "demo",
];

function csvCell(v: unknown): string {
  const s = v === null || v === undefined ? "" : String(v);
  return /[",;\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function editionOf(item: ItemRow): string {
  const c = getCard(item);
  if (!c) return "";
  if (c.first_edition) return "1st Edition";
  if (c.shadowless) return "Shadowless";
  if (c.unlimited) return "Unlimited";
  return "Standard";
}

export function exportCsv(items: ItemRow[]) {
  const lines = [HEADERS.join(";")];
  for (const item of items) {
    const card = getCard(item);
    const sealed = getSealedProduct(item);
    const priced = latestValuePrice(item);
    const value = priced ? currentValue(item) : null;
    const cost = totalCost(item);
    const decision = getLatestDecision(item);
    const change = priceChange(item);
    lines.push(
      [
        item.id,
        item.item_type,
        item.bucket,
        item.status,
        itemTitle(item),
        itemSubtitle(item),
        card?.language ?? sealed?.language ?? "",
        card?.set_name ?? sealed?.set_name ?? "",
        card?.card_number ?? "",
        editionOf(item),
        item.item_type === "CARD" ? (isGradedCard(item) ? "GRADED" : "RAW") : "",
        getCardGradingCompany(item) ?? "",
        getCardGrade(item) ?? "",
        card?.graded_certificate ?? "",
        quantity(item),
        cost > 0 ? cost.toFixed(2) : "",
        valuePriceType(item) ?? "",
        value === null ? "" : value.toFixed(2),
        priced ? formatObservedAt(priced) : "MAI PREZZATA",
        priceFreshness(item).status,
        change ? change.abs.toFixed(2) : "",
        value === null || cost <= 0 ? "" : (value - cost).toFixed(2),
        roi(item) === null ? "" : roi(item)!.toFixed(1),
        decision?.decision ?? "",
        decision?.buy_it_now_price ?? "",
        decision?.min_acceptable_price ?? "",
        expectedGradedValue(item) > 0 ? expectedGradedValue(item).toFixed(2) : "",
        latestGrading(item)?.recommendation ?? "",
        netRevenue(item) > 0 ? netRevenue(item).toFixed(2) : "",
        item.is_demo ? "SI" : "NO",
      ]
        .map(csvCell)
        .join(";"),
    );
  }
  download(`tcg-vault-${stamp()}.csv`, `\uFEFF${lines.join("\n")}`, "text/csv;charset=utf-8");
}
