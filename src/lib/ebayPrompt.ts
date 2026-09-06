import { currentValue, eur, itemTitle, latestCondition, totalCost } from "@/lib/calc";
import { formatObservedAt, latestValuePrice, priceFreshness } from "@/lib/analytics";
import {
  BUCKET_LABELS,
  DECISION_LABELS,
  getLatestDecision,
  type ItemRow,
} from "@/lib/types";

const TODO = "DA COMPLETARE";

function val(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === "" ) return TODO;
  return String(value);
}

function money(value: number | null | undefined): string {
  if (!value || value <= 0) return TODO;
  return eur(value);
}

/** Payload strutturato costruito solo con dati reali presenti nel DB. */
export function buildEbayPayload(item: ItemRow) {
  const card = item.cards[0] ?? null;
  const sealed = item.sealed_products[0] ?? null;
  const condition = latestCondition(item);
  const decision = getLatestDecision(item);
  const priceRow = latestValuePrice(item);
  const freshness = priceFreshness(item);
  const images = item.card_images;
  const has = (type: string) => images.some((i) => i.image_type === type);

  const flags = [
    card?.holo && "Holo",
    card?.reverse_holo && "Reverse Holo",
    card?.first_edition && "1ª Edizione",
    card?.shadowless && "Shadowless",
    card?.unlimited && "Unlimited",
    card?.promo && "Promo",
  ].filter(Boolean) as string[];

  return {
    item_id: item.id,
    tipo_item: item.item_type,
    bucket: BUCKET_LABELS[item.bucket] ?? item.bucket,
    stato_item: item.status,
    titolo_interno: itemTitle(item),
    nome: val(card ? card.card_name || card.pokemon_name : sealed?.name),
    pokemon: card ? val(card.pokemon_name) : "—",
    tipo_prodotto: sealed ? val(sealed.product_type) : "—",
    quantita: sealed?.quantity ?? 1,
    set: val(card?.set_name ?? sealed?.set_name),
    set_code: card ? val(card.set_code) : "—",
    numero: card
      ? card.card_number
        ? `${card.card_number}${card.set_total ? `/${card.set_total}` : ""}`
        : TODO
      : "—",
    anno: val(card?.year ?? sealed?.year),
    lingua: val(card?.language ?? sealed?.language),
    rarita: card ? val(card.rarity) : "—",
    variante: card ? val(card.variant) : "—",
    caratteristiche: flags.length ? flags.join(", ") : card ? "Nessuna (standard)" : "—",
    stato_carta: card ? card.card_state : "SEALED",
    grading_company: card?.card_state === "GRADED" ? val(card.graded_company) : "—",
    voto: card?.card_state === "GRADED" ? val(card.graded_grade) : "—",
    certificato: card?.card_state === "GRADED" ? val(card.graded_certificate) : "—",
    condizione: card?.card_state === "GRADED" ? "Slab graded" : val(condition?.overall_condition),
    dettagli_condizione: condition
      ? [
          condition.centering_front && `centratura fronte ${condition.centering_front}`,
          condition.centering_back && `centratura retro ${condition.centering_back}`,
          condition.edges && `bordi ${condition.edges}`,
          condition.corners && `angoli ${condition.corners}`,
          condition.whitening && `whitening ${condition.whitening}`,
          condition.scratches && `graffi ${condition.scratches}`,
          condition.creases && `pieghe ${condition.creases}`,
        ]
          .filter(Boolean)
          .join(", ") || TODO
      : TODO,
    condizione_sealed: sealed ? val(sealed.package_condition) : "—",
    costo_acquisto: money(totalCost(item)),
    valore_mercato: money(currentValue(item)),
    prezzo_tipo: priceRow?.price_type ?? TODO,
    prezzo_aggiornato: priceRow ? formatObservedAt(priceRow) : "Mai prezzata",
    prezzo_freschezza: freshness,
    decisione: decision ? DECISION_LABELS[decision.decision] : TODO,
    motivazione: val(decision?.rationale),
    target_buy_it_now: money(decision?.buy_it_now_price),
    minimo_accettabile: money(decision?.min_acceptable_price),
    note: val(item.notes ?? card?.notes),
    foto: {
      cover: has("COVER"),
      front: has("FRONT"),
      back: has("BACK"),
      extra: images.filter((i) => i.image_type === "EXTRA").length,
      totale: images.length,
    },
  };
}

export type EbayPayload = ReturnType<typeof buildEbayPayload>;

export function buildEbayPrompt(item: ItemRow): string {
  const p = buildEbayPayload(item);
  const dati = [
    `- item_id: ${p.item_id}`,
    `- Tipo: ${p.tipo_item} (${p.bucket}, stato ${p.stato_item})`,
    `- Nome: ${p.nome}`,
    p.tipo_item === "CARD" ? `- Pokémon: ${p.pokemon}` : `- Tipo prodotto: ${p.tipo_prodotto}`,
    `- Set: ${p.set}${p.set_code !== "—" ? ` (${p.set_code})` : ""}`,
    `- Numero: ${p.numero}`,
    `- Anno: ${p.anno}`,
    `- Lingua: ${p.lingua}`,
    `- Rarità: ${p.rarita}`,
    `- Variante: ${p.variante}`,
    `- Caratteristiche (holo/reverse/1st/shadowless/promo): ${p.caratteristiche}`,
    `- Quantità: ${p.quantita}`,
    `- RAW o GRADED: ${p.stato_carta}`,
    `- Grading company: ${p.grading_company}`,
    `- Voto: ${p.voto}`,
    `- Certificato: ${p.certificato}`,
    `- Condizione: ${p.condizione}`,
    `- Dettagli condizione: ${p.dettagli_condizione}`,
    p.condizione_sealed !== "—" ? `- Condizione confezione: ${p.condizione_sealed}` : null,
    `- Costo di acquisto: ${p.costo_acquisto}`,
    `- Valore di mercato corrente: ${p.valore_mercato} (tipo prezzo ${p.prezzo_tipo}, aggiornato ${p.prezzo_aggiornato}, stato ${p.prezzo_freschezza})`,
    `- Decisione di investimento: ${p.decisione}`,
    `- Motivazione: ${p.motivazione}`,
    `- Target Compra Subito: ${p.target_buy_it_now}`,
    `- Minimo accettabile: ${p.minimo_accettabile}`,
    `- Note: ${p.note}`,
    `- Foto disponibili: cover ${p.foto.cover ? "sì" : "no"}, fronte ${p.foto.front ? "sì" : "no"}, retro ${p.foto.back ? "sì" : "no"}, extra ${p.foto.extra}, totale ${p.foto.totale}`,
  ]
    .filter(Boolean)
    .join("\n");

  return `Sei un esperto di vendita di carte Pokémon su eBay Italia. Guidami PASSO PASSO nella creazione MANUALE di un'inserzione eBay per l'oggetto qui sotto. Non pubblicare nulla, non usare tool: dammi istruzioni operative numerate che io eseguirò a mano su eBay.

DATI REALI DELL'OGGETTO (dal mio database personale, non modificarli e non inventarne di nuovi):
${dati}

REGOLA FONDAMENTALE: qualsiasi campo marcato "${TODO}" è un dato che NON hai. Non inventarlo e non stimarlo: chiedimelo esplicitamente all'inizio, in un elenco di domande brevi, e attendi la mia risposta prima di finalizzare prezzi e descrizione.

Dopo le domande, produci:
1. TITOLO eBay ottimizzato (max 80 caratteri, con conteggio caratteri) + 2 varianti alternative.
2. CATEGORIA eBay consigliata (percorso completo).
3. SPECIFICHE OGGETTO (item specifics) in coppie campo/valore pronte da copiare.
4. CONDIZIONE eBay da selezionare + testo descrizione condizione.
5. DESCRIZIONE completa dell'inserzione, in italiano, onesta e leggibile da mobile.
6. PREZZO Compra Subito consigliato, prezzo minimo accettabile e soglia di rifiuto automatico offerte, coerenti con costo e valore di mercato reali indicati sopra.
7. STRATEGIA OFFERTE (accetta/contro-offerta/rifiuta) e come gestire il tempo in inserzione.
8. SPEDIZIONE E IMBALLAGGIO: materiali, tipo di spedizione, tracciamento, tempi, gestione slab/carta raw.
9. FOTO da usare e in quale ordine, in base alle foto disponibili elencate; dimmi quali mancano e vanno scattate.
10. DIFETTI da dichiarare esplicitamente, se presenti nei dati o da verificare.
11. CHECKLIST FINALE prima di pubblicare.

Rispondi in italiano, in modo compatto e operativo, un passo alla volta se serve conferma.`;
}
