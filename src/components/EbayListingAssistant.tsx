import { useMemo } from "react";
import { Copy, ExternalLink, Store } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { currentValue, eur, itemTitle, latestCondition, totalCost } from "@/lib/calc";
import type { ItemRow } from "@/lib/types";

const EBAY_SELL_URL = "https://www.ebay.it/sl/sell";

function roundListingPrice(value: number): number {
  if (value <= 0) return 0;
  return Math.max(0.99, Math.ceil(value) - 0.01);
}

function compact(values: Array<string | number | null | undefined | false>): string[] {
  return values
    .filter(
      (value): value is string | number =>
        value !== null && value !== undefined && value !== false && value !== "",
    )
    .map(String);
}

function ebayCondition(condition?: string | null): string {
  const value = condition?.toUpperCase();
  if (!value) return "Usato — condizione da verificare nelle foto";
  if (["GEM MT", "MINT", "NM"].includes(value)) return `Usato — ${value}, ottime condizioni`;
  if (["EX", "GD"].includes(value)) return `Usato — ${value}, buone condizioni`;
  if (["LP", "PL"].includes(value)) return `Usato — ${value}, presenta segni di utilizzo`;
  return `Usato — ${value}, vedere foto e descrizione`;
}

function buildDraft(item: ItemRow) {
  const card = item.cards[0] ?? ({} as NonNullable<(typeof item.cards)[number]>);
  const condition = latestCondition(item);
  const rawMarket = currentValue(item);
  const cost = totalCost(item);
  const base = rawMarket > 0 ? rawMarket : cost > 0 ? cost * 1.25 : 0;
  const buyNow = roundListingPrice(base * 1.1);
  const minimumOffer = roundListingPrice(base * 0.92);
  const variant = compact([
    card.holo && "Holo",
    card.reverse_holo && "Reverse Holo",
    card.first_edition && "1ª Edizione",
    card.shadowless && "Shadowless",
    card.unlimited && "Unlimited",
    card.promo && "Promo",
    card.variant,
  ]).join(" ");
  const number = card.card_number
    ? `${card.card_number}${card.set_total ? `/${card.set_total}` : ""}`
    : "";
  const title = compact([
    "Pokémon",
    card.pokemon_name,
    card.card_name !== card.pokemon_name && card.card_name,
    card.set_name,
    number,
    variant,
    card.language,
  ])
    .join(" ")
    .slice(0, 80)
    .trim();
  const conditionText = ebayCondition(condition?.overall_condition);
  const description = [
    `${itemTitle(item)} originale Pokémon TCG.`,
    "",
    `Set: ${card.set_name || "da specificare"}`,
    `Numero: ${number || "da specificare"}`,
    `Lingua: ${card.language || "da specificare"}`,
    `Anno: ${card.year || "da specificare"}`,
    `Rarità: ${card.rarity || "da specificare"}`,
    `Variante: ${variant || "standard"}`,
    `Condizione: ${conditionText}`,
    condition?.whitening ? `Whitening: ${condition.whitening}` : "",
    condition?.scratches ? `Graffi: ${condition.scratches}` : "",
    condition?.creases ? `Pieghe: ${condition.creases}` : "",
    item.notes ? `Note: ${item.notes}` : "",
    "",
    "Le fotografie fanno parte integrante della descrizione. Carta spedita protetta con sleeve e supporto rigido. Per dubbi o altre foto contattami prima dell’acquisto.",
  ]
    .filter(Boolean)
    .join("\n");

  return {
    title,
    category: "Collezionismo > Giochi di carte collezionabili > Pokémon",
    condition: conditionText,
    format: "Compralo Subito con Proposta d'acquisto",
    buyNow,
    minimumOffer,
    quantity: 1,
    shipping: "Spedizione tracciata; inserire costo reale oppure ritiro a mano",
    specifics: compact([
      `Gioco: Pokémon TCG`,
      card.set_name && `Set: ${card.set_name}`,
      card.card_number && `Numero carta: ${number}`,
      card.language && `Lingua: ${card.language}`,
      card.year && `Anno: ${card.year}`,
      card.rarity && `Rarità: ${card.rarity}`,
      variant && `Caratteristiche: ${variant}`,
    ]).join("\n"),
    description,
    hasPrice: base > 0,
  };
}

function DraftRow({ label, value }: { label: string; value: string }) {
  const copy = async () => {
    await navigator.clipboard.writeText(value);
    toast.success(`${label} copiato`);
  };

  return (
    <div className="grid gap-1 border-b border-border/60 py-2 last:border-0 sm:grid-cols-[150px_1fr_auto] sm:items-center">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="min-w-0 whitespace-pre-wrap break-words text-sm">{value}</p>
      <Button variant="ghost" size="icon" onClick={copy} aria-label={`Copia ${label}`}>
        <Copy className="h-4 w-4" />
      </Button>
    </div>
  );
}

export function EbayListingAssistant({ item }: { item: ItemRow }) {
  const draft = useMemo(() => buildDraft(item), [item]);
  const fullDraft = [
    `TITOLO\n${draft.title}`,
    `CATEGORIA\n${draft.category}`,
    `CONDIZIONE\n${draft.condition}`,
    `FORMATO\n${draft.format}`,
    `PREZZO COMPRALO SUBITO\n${draft.hasPrice ? eur(draft.buyNow) : "da definire"}`,
    `PROPOSTA MINIMA\n${draft.hasPrice ? eur(draft.minimumOffer) : "da definire"}`,
    `QUANTITÀ\n${draft.quantity}`,
    `SPEDIZIONE\n${draft.shipping}`,
    `SPECIFICHE\n${draft.specifics}`,
    `DESCRIZIONE\n${draft.description}`,
  ].join("\n\n");

  const copyAll = async () => {
    await navigator.clipboard.writeText(fullDraft);
    toast.success("Bozza eBay completa copiata");
  };

  return (
    <details className="group rounded-lg border border-red-500/25 bg-red-950/10 p-4">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3">
        <span className="flex items-center gap-2 font-semibold">
          <Store className="h-5 w-5 text-red-300" /> Assistente inserzione eBay
        </span>
        <span className="text-xs text-muted-foreground group-open:hidden">Apri</span>
        <span className="hidden text-xs text-muted-foreground group-open:inline">Chiudi</span>
      </summary>

      <div className="mt-4">
        {!draft.hasPrice ? (
          <p className="mb-3 rounded-md border border-amber-400/25 bg-amber-400/10 p-3 text-xs text-amber-200">
            Aggiungi il valore raw della carta per ottenere un prezzo suggerito affidabile.
          </p>
        ) : (
          <p className="mb-3 text-xs text-muted-foreground">
            Prezzo suggerito: 10% sopra il valore raw, con proposta minima circa all’8% sotto
            mercato.
          </p>
        )}
        <DraftRow label="Titolo" value={draft.title} />
        <DraftRow label="Categoria" value={draft.category} />
        <DraftRow label="Condizione" value={draft.condition} />
        <DraftRow label="Formato" value={draft.format} />
        <DraftRow
          label="Compralo Subito"
          value={draft.hasPrice ? eur(draft.buyNow) : "Da definire"}
        />
        <DraftRow
          label="Proposta minima"
          value={draft.hasPrice ? eur(draft.minimumOffer) : "Da definire"}
        />
        <DraftRow label="Spedizione" value={draft.shipping} />
        <DraftRow label="Specifiche" value={draft.specifics} />
        <DraftRow label="Descrizione" value={draft.description} />

        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          <Button variant="outline" onClick={copyAll}>
            <Copy className="h-4 w-4" /> Copia tutto
          </Button>
          <Button asChild>
            <a href={EBAY_SELL_URL} target="_blank" rel="noreferrer">
              <ExternalLink className="h-4 w-4" /> Crea inserzione su eBay
            </a>
          </Button>
        </div>
      </div>
    </details>
  );
}
