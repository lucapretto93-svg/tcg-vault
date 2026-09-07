import { getCard, type ItemRow } from "./types";

/**
 * Coerenza lingua dei set: analisi deterministica, solo su dati reali già in DB.
 * Nessuna AI, nessun catalogo esterno: l'esistenza dell'edizione italiana di un
 * set viene dichiarata solo se nel database esiste almeno una carta IT di quel set.
 */

export type LanguageStatus = "MONO_IT" | "MONO_OTHER" | "MISTO" | "DA_VERIFICARE";

export const LANGUAGE_STATUS_LABELS: Record<LanguageStatus, string> = {
  MONO_IT: "MONO IT",
  MONO_OTHER: "MONO",
  MISTO: "MISTO",
  DA_VERIFICARE: "DA VERIFICARE",
};

export interface LanguageCount {
  language: string;
  count: number;
}

export interface SetLanguageRow {
  key: string;
  setName: string;
  setCode: string | null;
  owned: number;
  counts: LanguageCount[];
  /** Lingua obiettivo consigliata: IT se esiste evidenza nei dati, altrimenti la maggioritaria. */
  targetLanguage: string | null;
  status: LanguageStatus;
  statusLabel: string;
  /** Carte già possedute ma nella lingua sbagliata, da sostituire/tradare. */
  toReplace: number;
  offLanguageItems: ItemRow[];
  unknownLanguage: number;
  suggestion: string | null;
}

/** Chiave di famiglia del set, indipendente dalla lingua. */
export function setFamilyKey(item: ItemRow): string | null {
  const card = getCard(item);
  if (!card) return null;
  const name = card.set_name?.trim().toLowerCase();
  const code = card.set_code?.trim().toLowerCase();
  const base = name || code;
  return base ? base : null;
}

function normalizedLanguage(item: ItemRow): string | null {
  const lang = getCard(item)?.language?.trim();
  return lang ? lang.toUpperCase() : null;
}

function normalizedNumber(item: ItemRow): string | null {
  const raw = getCard(item)?.card_number?.trim();
  if (!raw) return null;
  const match = raw.match(/\d+/);
  return match ? String(Number(match[0])) : null;
}

export function buildSetLanguageRows(items: ItemRow[]): SetLanguageRow[] {
  const families = new Map<string, ItemRow[]>();

  for (const item of items) {
    if (item.item_type !== "CARD" || item.status === "SOLD") continue;
    const key = setFamilyKey(item);
    if (!key) continue;
    const list = families.get(key);
    if (list) list.push(item);
    else families.set(key, [item]);
  }

  const rows: SetLanguageRow[] = [];

  for (const [key, list] of families) {
    const card = getCard(list[0]!);
    const counts = new Map<string, number>();
    let unknown = 0;

    for (const item of list) {
      const lang = normalizedLanguage(item);
      if (!lang) unknown += 1;
      else counts.set(lang, (counts.get(lang) ?? 0) + 1);
    }

    const countList: LanguageCount[] = [...counts.entries()]
      .map(([language, count]) => ({ language, count }))
      .sort((a, b) => b.count - a.count || a.language.localeCompare(b.language));

    // Priorità IT solo con evidenza reale: almeno una carta IT del set nel DB.
    const target =
      countList.find((c) => c.language === "IT")?.language ?? countList[0]?.language ?? null;

    const offLanguageItems = target
      ? list.filter((item) => {
          const lang = normalizedLanguage(item);
          return lang != null && lang !== target;
        })
      : [];

    let status: LanguageStatus;
    if (!target || unknown > 0) status = "DA_VERIFICARE";
    else if (countList.length > 1) status = "MISTO";
    else status = target === "IT" ? "MONO_IT" : "MONO_OTHER";

    const otherLangs = [...new Set(offLanguageItems.map((i) => normalizedLanguage(i)!))];
    const suggestion =
      target && offLanguageItems.length > 0
        ? `Sostituisci ${offLanguageItems.length} ${otherLangs.join("/")} con copie ${target}`
        : null;

    rows.push({
      key,
      setName: card?.set_name?.trim() || card?.set_code?.trim() || key,
      setCode: card?.set_code ?? null,
      owned: list.length,
      counts: countList,
      targetLanguage: target,
      status,
      statusLabel:
        status === "MONO_OTHER" && target
          ? `MONO ${target}`
          : LANGUAGE_STATUS_LABELS[status],
      toReplace: offLanguageItems.length,
      offLanguageItems,
      unknownLanguage: unknown,
      suggestion,
    });
  }

  return rows.sort(
    (a, b) => b.toReplace - a.toReplace || b.owned - a.owned || a.setName.localeCompare(b.setName),
  );
}

export interface SetLanguageIndex {
  /** Lingua obiettivo del set (famiglia), se determinabile. */
  targetOf(familyKey: string): string | null;
  /** Lingue in cui la carta numero N di quel set è già posseduta. */
  ownedLanguages(familyKey: string, number: string): string[];
}

/** Indice riutilizzabile per distinguere "mancante" da "posseduta in altra lingua". */
export function buildSetLanguageIndex(items: ItemRow[]): SetLanguageIndex {
  const rows = buildSetLanguageRows(items);
  const targets = new Map<string, string | null>(rows.map((r) => [r.key, r.targetLanguage]));
  const byNumber = new Map<string, Map<string, Set<string>>>();

  for (const item of items) {
    if (item.item_type !== "CARD" || item.status === "SOLD") continue;
    const key = setFamilyKey(item);
    const num = normalizedNumber(item);
    const lang = normalizedLanguage(item);
    if (!key || !num || !lang) continue;
    let numbers = byNumber.get(key);
    if (!numbers) {
      numbers = new Map();
      byNumber.set(key, numbers);
    }
    const langs = numbers.get(num);
    if (langs) langs.add(lang);
    else numbers.set(num, new Set([lang]));
  }

  return {
    targetOf: (familyKey) => targets.get(familyKey) ?? null,
    ownedLanguages: (familyKey, number) => [...(byNumber.get(familyKey)?.get(number) ?? [])],
  };
}
