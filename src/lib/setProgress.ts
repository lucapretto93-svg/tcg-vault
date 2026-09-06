import type { CardRow, ItemRow } from "./types";
import { getCard } from "./types";

export interface SetGroup {
  key: string;
  setName: string;
  setCode: string | null;
  language: string;
  edition: string;
  variant: string;
  total: number | null;
  ownedNumbers: string[];
  owned: number;
  percent: number | null;
  missingNumbers: string[];
  nearCompletion: boolean;
  items: ItemRow[];
}

function editionOf(card: CardRow): string {
  if (card.first_edition) return "1st Edition";
  if (card.shadowless) return "Shadowless";
  if (card.unlimited) return "Unlimited";
  return "Standard";
}

function variantOf(card: CardRow): string {
  if (card.reverse_holo) return "Reverse Holo";
  if (card.promo) return "Promo";
  const v = card.variant?.trim();
  return v || "Normale";
}

function numeric(value: string | null): number | null {
  if (!value) return null;
  const match = value.match(/\d+/);
  if (!match) return null;
  const n = Number(match[0]);
  return Number.isFinite(n) && n > 0 ? n : null;
}

/** Percentuale oltre la quale un set è considerato "vicino al completamento". */
export const NEAR_COMPLETION_THRESHOLD = 75;

export function buildSetProgress(items: ItemRow[]): SetGroup[] {
  const groups = new Map<string, SetGroup>();

  for (const item of items) {
    if (item.item_type !== "CARD" || item.status === "SOLD") continue;
    const card = getCard(item);
    if (!card) continue;
    const setName = card.set_name?.trim() || card.set_code?.trim();
    if (!setName) continue;

    const language = card.language?.trim() || "N/D";
    const edition = editionOf(card);
    const variant = variantOf(card);
    const key = [setName.toLowerCase(), card.set_code ?? "", language, edition, variant].join("|");

    let group = groups.get(key);
    if (!group) {
      group = {
        key,
        setName,
        setCode: card.set_code,
        language,
        edition,
        variant,
        total: null,
        ownedNumbers: [],
        owned: 0,
        percent: null,
        missingNumbers: [],
        nearCompletion: false,
        items: [],
      };
      groups.set(key, group);
    }

    group.items.push(item);
    const total = numeric(card.set_total);
    if (total && (!group.total || total > group.total)) group.total = total;
    const num = numeric(card.card_number);
    if (num && !group.ownedNumbers.includes(String(num))) group.ownedNumbers.push(String(num));
  }

  const result: SetGroup[] = [];
  for (const group of groups.values()) {
    group.ownedNumbers.sort((a, b) => Number(a) - Number(b));
    group.owned = group.ownedNumbers.length || group.items.length;

    if (group.total) {
      const ownedSet = new Set(group.ownedNumbers.map(Number));
      const missing: string[] = [];
      for (let n = 1; n <= group.total; n += 1) {
        if (!ownedSet.has(n)) missing.push(String(n));
      }
      group.missingNumbers = missing;
      group.percent = Math.min(100, (ownedSet.size / group.total) * 100);
      group.nearCompletion = group.percent >= NEAR_COMPLETION_THRESHOLD && missing.length > 0;
    }
    result.push(group);
  }

  return result.sort((a, b) => (b.percent ?? -1) - (a.percent ?? -1) || b.owned - a.owned);
}

export interface MissingTarget {
  group: SetGroup;
  number: string;
  priority: "SET COMPLETION";
}

/** Carte mancanti dei set vicini al completamento: input per il radar offerte. */
export function setCompletionTargets(groups: SetGroup[], limit = 40): MissingTarget[] {
  const targets: MissingTarget[] = [];
  for (const group of groups.filter((g) => g.nearCompletion)) {
    for (const number of group.missingNumbers) {
      targets.push({ group, number, priority: "SET COMPLETION" });
      if (targets.length >= limit) return targets;
    }
  }
  return targets;
}
