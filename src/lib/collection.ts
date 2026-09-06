import { currentValue, totalCost } from "./calc";
import { getCard, getCoverImage, type CardRow, type ImageRow, type ItemRow } from "./types";

/** Soglia oltre la quale segnaliamo "Completa set". */
export const ALMOST_COMPLETE = 85;

export interface CollectionSlot {
  /** Chiave slot: numero + variante richiesta (i doppioni condividono lo stesso slot). */
  key: string;
  number: string | null;
  /** Ordinamento numerico quando disponibile. */
  order: number;
  owned: boolean;
  items: ItemRow[];
}

export interface CollectionSet {
  key: string;
  setName: string;
  setCode: string | null;
  year: number | null;
  total: number | null;
  /** Slot unici posseduti (doppioni esclusi). */
  ownedUnique: number;
  duplicates: number;
  copies: number;
  percent: number | null;
  value: number;
  cost: number;
  unrealized: number;
  slots: CollectionSlot[];
  previews: ImageRow[];
  languages: string[];
  vintage: boolean;
  items: ItemRow[];
}

function numeric(value: string | null | undefined): number | null {
  if (!value) return null;
  const match = value.match(/\d+/);
  if (!match) return null;
  const n = Number(match[0]);
  return Number.isFinite(n) ? n : null;
}

function variantKey(card: CardRow): string {
  const parts: string[] = [];
  if (card.reverse_holo) parts.push("rev");
  else if (card.holo) parts.push("holo");
  if (card.first_edition) parts.push("1st");
  if (card.promo) parts.push("promo");
  return parts.join("-") || "base";
}

export function setKeyOf(card: CardRow): string | null {
  const name = card.set_name?.trim();
  const code = card.set_code?.trim();
  const base = code || name;
  if (!base) return null;
  return base.toLowerCase();
}

/** Costruisce la vista Collezione per set dai soli dati già presenti nel DB. */
export function buildCollection(items: ItemRow[]): CollectionSet[] {
  const map = new Map<string, CollectionSet>();

  for (const item of items) {
    if (item.item_type !== "CARD" || item.status === "SOLD") continue;
    const card = getCard(item);
    if (!card) continue;
    const key = setKeyOf(card);
    if (!key) continue;

    let group = map.get(key);
    if (!group) {
      group = {
        key,
        setName: card.set_name?.trim() || card.set_code?.trim() || "Set sconosciuto",
        setCode: card.set_code,
        year: card.year ?? null,
        total: null,
        ownedUnique: 0,
        duplicates: 0,
        copies: 0,
        percent: null,
        value: 0,
        cost: 0,
        unrealized: 0,
        slots: [],
        previews: [],
        languages: [],
        vintage: false,
        items: [],
      };
      map.set(key, group);
    }

    if (!group.setName || group.setName === "Set sconosciuto") {
      group.setName = card.set_name?.trim() || group.setName;
    }
    if (!group.setCode && card.set_code) group.setCode = card.set_code;
    if (card.year && (!group.year || card.year < group.year)) group.year = card.year;
    const total = numeric(card.set_total);
    if (total && total > 0 && (!group.total || total > group.total)) group.total = total;
    const lang = card.language?.trim();
    if (lang && !group.languages.includes(lang)) group.languages.push(lang);

    group.items.push(item);
    group.copies += 1;
    group.value += currentValue(item);
    group.cost += totalCost(item);

    const num = numeric(card.card_number);
    const slotKey = `${card.card_number?.trim().toLowerCase() || `no-${item.id}`}|${variantKey(card)}`;
    let slot = group.slots.find((s) => s.key === slotKey);
    if (!slot) {
      slot = {
        key: slotKey,
        number: card.card_number?.trim() || null,
        order: num ?? Number.MAX_SAFE_INTEGER,
        owned: true,
        items: [],
      };
      group.slots.push(slot);
    }
    slot.items.push(item);

    const cover = getCoverImage(item);
    if (cover && group.previews.length < 4) group.previews.push(cover);
  }

  const result: CollectionSet[] = [];
  for (const group of map.values()) {
    group.unrealized = group.value - group.cost;
    group.duplicates = group.slots.reduce((acc, s) => acc + Math.max(0, s.items.length - 1), 0);

    // Slot mancanti solo se il totale del set è noto nel DB.
    if (group.total) {
      const ownedNumbers = new Set(
        group.slots.map((s) => numeric(s.number)).filter((n): n is number => n != null),
      );
      for (let n = 1; n <= group.total; n += 1) {
        if (ownedNumbers.has(n)) continue;
        group.slots.push({
          key: `missing-${n}`,
          number: String(n),
          order: n,
          owned: false,
          items: [],
        });
      }
      group.ownedUnique = ownedNumbers.size || group.slots.filter((s) => s.owned).length;
      group.percent = Math.min(100, (group.ownedUnique / group.total) * 100);
    } else {
      group.ownedUnique = group.slots.filter((s) => s.owned).length;
    }

    group.slots.sort((a, b) => a.order - b.order || (a.number ?? "").localeCompare(b.number ?? ""));
    group.vintage = group.year != null && group.year <= 2003;
    result.push(group);
  }

  return result.sort((a, b) => (b.percent ?? -1) - (a.percent ?? -1) || b.value - a.value);
}
