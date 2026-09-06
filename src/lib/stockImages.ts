import { queryOptions } from "@tanstack/react-query";

/**
 * Immagini "stock" ufficiali delle carte (TCGdex, API pubblica e gratuita).
 * Usate SOLO nella vista per set: le foto personali restano quelle caricate dall'utente.
 */
const API = "https://api.tcgdex.net/v2";

export interface StockSet {
  id: string;
  /** Mappa numero carta -> URL immagine stock. */
  images: Record<string, string>;
}

interface TcgdexSetListEntry {
  id: string;
  name: string;
}

function normalize(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

async function getJson<T>(url: string): Promise<T | null> {
  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    return (await response.json()) as T;
  } catch {
    return null;
  }
}

async function loadIndex(): Promise<Map<string, string>> {
  const [it, en] = await Promise.all([
    getJson<TcgdexSetListEntry[]>(`${API}/it/sets`),
    getJson<TcgdexSetListEntry[]>(`${API}/en/sets`),
  ]);
  const index = new Map<string, string>();
  for (const entry of [...(it ?? []), ...(en ?? [])]) {
    if (!entry?.id || !entry?.name) continue;
    const key = normalize(entry.name);
    if (key && !index.has(key)) index.set(key, entry.id);
    if (!index.has(entry.id.toLowerCase())) index.set(entry.id.toLowerCase(), entry.id);
  }
  return index;
}

interface TcgdexSetDetail {
  id: string;
  cards?: { localId?: string; image?: string | null }[];
}

/** Risolve il set e scarica la lista di immagini stock; null se il set non è nel database pubblico. */
export async function fetchStockSet(
  setName: string | null,
  setCode: string | null,
): Promise<StockSet | null> {
  const index = await loadIndex();
  const candidates = [setCode?.trim().toLowerCase(), setName ? normalize(setName) : null].filter(
    (v): v is string => !!v,
  );
  const id = candidates.map((c) => index.get(c)).find(Boolean);
  if (!id) return null;

  const detail = await getJson<TcgdexSetDetail>(`${API}/en/sets/${id}`);
  if (!detail?.cards?.length) return null;

  const images: Record<string, string> = {};
  for (const card of detail.cards) {
    if (!card.localId || !card.image) continue;
    images[String(card.localId).toLowerCase()] = `${card.image}/low.webp`;
  }
  return { id, images };
}

export function stockSetQuery(setName: string | null, setCode: string | null) {
  return queryOptions({
    queryKey: ["stock-set", setName ?? "", setCode ?? ""],
    queryFn: () => fetchStockSet(setName, setCode),
    staleTime: 24 * 60 * 60 * 1000,
    gcTime: 24 * 60 * 60 * 1000,
    retry: 1,
  });
}

/** Cerca l'immagine stock per un numero carta (accetta "15", "015", "15/123"). */
export function stockImageFor(set: StockSet | null | undefined, number: string | null): string | null {
  if (!set || !number) return null;
  const raw = number.split("/")[0]?.trim().toLowerCase();
  if (!raw) return null;
  const direct = set.images[raw];
  if (direct) return direct;
  const stripped = raw.replace(/^0+/, "");
  return set.images[stripped] ?? set.images[stripped.padStart(3, "0")] ?? null;
}
