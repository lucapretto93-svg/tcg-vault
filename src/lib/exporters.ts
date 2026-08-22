import type { ItemRow } from "./types";
import {
  currentValue,
  expectedGradedValue,
  itemSubtitle,
  itemTitle,
  latestGrading,
  netRevenue,
  roi,
  totalCost,
} from "./calc";

function download(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function exportJson(items: ItemRow[]) {
  download(
    `pokemon-collection-${new Date().toISOString().slice(0, 10)}.json`,
    JSON.stringify(items, null, 2),
    "application/json",
  );
}

const HEADERS = [
  "id",
  "tipo",
  "stato",
  "titolo",
  "dettagli",
  "costo_totale",
  "valore_corrente",
  "expected_graded_value",
  "raccomandazione",
  "ricavo_netto",
  "roi_percento",
  "demo",
];

function csvCell(v: unknown): string {
  const s = String(v ?? "");
  return /[",;\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function exportCsv(items: ItemRow[]) {
  const lines = [HEADERS.join(";")];
  for (const item of items) {
    lines.push(
      [
        item.id,
        item.item_type,
        item.status,
        itemTitle(item),
        itemSubtitle(item),
        totalCost(item).toFixed(2),
        currentValue(item).toFixed(2),
        expectedGradedValue(item).toFixed(2),
        latestGrading(item)?.recommendation ?? "",
        netRevenue(item).toFixed(2),
        (roi(item) ?? 0).toFixed(1),
        item.is_demo ? "SI" : "NO",
      ]
        .map(csvCell)
        .join(";"),
    );
  }
  download(
    `pokemon-collection-${new Date().toISOString().slice(0, 10)}.csv`,
    `\uFEFF${lines.join("\n")}`,
    "text/csv;charset=utf-8",
  );
}
