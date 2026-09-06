import type { CardtraderDeal } from "./cardtrader";
import type { ItemRow } from "./types";

export function norm(value: string | null | undefined): string {
  return (value ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "");
}

/** Quante carte uniche possiedi in ciascun set: più ne hai, più il set è vicino a chiudersi. */
export function ownedBySetMap(items: ItemRow[]): Map<string, number> {
  const map = new Map<string, Set<string>>();
  for (const item of items) {
    const card = item.cards[0];
    if (!card) continue;
    const keys = [norm(card.set_name), norm(card.set_code)].filter(Boolean);
    for (const key of keys) {
      const nums = map.get(key) ?? new Set<string>();
      nums.add(norm(card.card_number) || card.id);
      map.set(key, nums);
    }
  }
  return new Map([...map].map(([k, v]) => [k, v.size]));
}

export function setUrgency(owned: Map<string, number>, deal: CardtraderDeal): number {
  return Math.max(owned.get(norm(deal.set_name)) ?? 0, owned.get(norm(deal.expansion_code)) ?? 0);
}
