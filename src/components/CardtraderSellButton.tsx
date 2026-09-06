import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { ExternalLink, Search, Store, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { CT_CONDITIONS, CT_LANGUAGES, cardtraderListingsQuery } from "@/lib/cardtrader";
import {
  cardtraderStatus,
  publishCardtraderListing,
  removeCardtraderListing,
  searchCardtraderBlueprints,
  updateCardtraderListing,
} from "@/lib/cardtrader.functions";
import { currentValue, itemSubtitle, itemTitle } from "@/lib/calc";
import { getCard, type ItemRow } from "@/lib/types";

function suggestedCondition(item: ItemRow): string {
  const overall = item.condition_assessments[0]?.overall_condition?.toUpperCase() ?? "";
  if (overall.includes("GEM") || overall === "MINT") return "Mint";
  if (overall === "NM" || overall === "EX") return "Near Mint";
  if (overall === "GD" || overall === "LP") return "Slightly Played";
  if (overall === "PL") return "Moderately Played";
  if (overall === "PO") return "Played";
  return "Near Mint";
}

export function CardtraderSellButton({ item }: { item: ItemRow }) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const card = getCard(item);
  const value = currentValue(item);

  const [blueprintId, setBlueprintId] = useState("");
  const [query, setQuery] = useState(card?.card_name ?? "");
  const [price, setPrice] = useState(value != null ? String(Math.round(value * 100) / 100) : "");
  const [quantity, setQuantity] = useState("1");
  const [condition, setCondition] = useState(suggestedCondition(item));
  const [language, setLanguage] = useState((card?.language ?? "en").toLowerCase());
  const [results, setResults] = useState<{ id: number; name: string; expansion: string }[]>([]);

  const statusFn = useServerFn(cardtraderStatus);
  const status = useQuery({
    queryKey: ["cardtrader_status"],
    queryFn: () => statusFn({}),
    enabled: open,
    staleTime: 60_000,
  });
  const searchFn = useServerFn(searchCardtraderBlueprints);
  const publishFn = useServerFn(publishCardtraderListing);
  const updateFn = useServerFn(updateCardtraderListing);
  const removeFn = useServerFn(removeCardtraderListing);

  const { data: listings = [] } = useQuery({ ...cardtraderListingsQuery(), enabled: open });
  const listing = useMemo(
    () => listings.find((l) => l.item_id === item.id) ?? null,
    [listings, item.id],
  );

  const search = useMutation({
    mutationFn: () => searchFn({ data: { query } }),
    onSuccess: (data) => {
      setResults(data.results);
      if (!data.configured) toast.warning("Configura CardTrader per cercare i prodotti.");
      else if (data.results.length === 0) toast.info("Nessun prodotto trovato per questa ricerca.");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const publish = useMutation({
    mutationFn: () =>
      publishFn({
        data: {
          itemId: item.id,
          blueprintId,
          price: Number(price),
          quantity: Number(quantity),
          condition,
          language,
          description: item.notes ?? "",
        },
      }),
    onSuccess: async (result) => {
      await queryClient.invalidateQueries({ queryKey: ["cardtrader_listings"] });
      if (result.ok) toast.success("Inserzione CardTrader pubblicata e sincronizzata.");
      else toast.error(result.error);
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const update = useMutation({
    mutationFn: () =>
      updateFn({ data: { itemId: item.id, price: Number(price), quantity: Number(quantity) } }),
    onSuccess: async (result) => {
      await queryClient.invalidateQueries({ queryKey: ["cardtrader_listings"] });
      if (result.ok) toast.success("Inserzione aggiornata.");
      else toast.error(result.error);
    },
  });

  const remove = useMutation({
    mutationFn: () => removeFn({ data: { itemId: item.id } }),
    onSuccess: async (result) => {
      await queryClient.invalidateQueries({ queryKey: ["cardtrader_listings"] });
      if (result.ok) toast.success("Inserzione rimossa.");
      else toast.error(result.error);
    },
  });

  if (!card) return null;
  const configured = status.data?.tokenConfigured && status.data?.connected;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="secondary">
          <Store className="mr-1 h-4 w-4" /> Vendi su CardTrader
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Vendi su CardTrader</DialogTitle>
          <DialogDescription>
            {itemTitle(item)} — {itemSubtitle(item)}
          </DialogDescription>
        </DialogHeader>

        {status.isLoading ? <p className="text-sm text-muted-foreground">Verifico connessione…</p> : null}
        {status.data && !configured ? (
          <p className="rounded-lg border border-dashed border-border p-3 text-sm text-muted-foreground">
            CardTrader non è ancora collegato: {status.data.error ?? "connessione non disponibile"}. Puoi
            comunque preparare i dati e salvarli; la pubblicazione sarà possibile appena la connessione è
            attiva.
          </p>
        ) : null}

        {listing ? (
          <div className="rounded-lg border border-border p-3 text-sm">
            <Badge variant="secondary">{listing.status}</Badge>{" "}
            {listing.listing_id ? `Listing ${listing.listing_id}` : "Nessun ID CardTrader"} ·{" "}
            {listing.quantity}× a {listing.price} €
            {listing.last_error ? (
              <p className="mt-1 text-xs text-destructive">{listing.last_error}</p>
            ) : null}
          </div>
        ) : null}

        <div className="space-y-3">
          <div>
            <p className="mb-1 text-xs text-muted-foreground">Prodotto CardTrader (blueprint)</p>
            <div className="flex gap-2">
              <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Nome carta" />
              <Button
                type="button"
                variant="outline"
                disabled={search.isPending}
                onClick={() => search.mutate()}
              >
                <Search className="h-4 w-4" />
              </Button>
            </div>
            {results.length > 0 ? (
              <div className="mt-2 max-h-40 space-y-1 overflow-y-auto rounded-md border border-border p-1">
                {results.map((result) => (
                  <button
                    key={result.id}
                    type="button"
                    onClick={() => setBlueprintId(String(result.id))}
                    className={`block w-full rounded px-2 py-1 text-left text-xs hover:bg-muted ${
                      blueprintId === String(result.id) ? "bg-muted" : ""
                    }`}
                  >
                    {result.name} · {result.expansion}
                  </button>
                ))}
              </div>
            ) : null}
            <Input
              className="mt-2"
              value={blueprintId}
              onChange={(e) => setBlueprintId(e.target.value)}
              placeholder="ID prodotto CardTrader"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <label className="text-xs text-muted-foreground">
              Prezzo (€)
              <Input value={price} onChange={(e) => setPrice(e.target.value)} inputMode="decimal" />
            </label>
            <label className="text-xs text-muted-foreground">
              Quantità
              <Input value={quantity} onChange={(e) => setQuantity(e.target.value)} inputMode="numeric" />
            </label>
            <label className="text-xs text-muted-foreground">
              Condizione
              <select
                className="mt-1 h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
                value={condition}
                onChange={(e) => setCondition(e.target.value)}
              >
                {CT_CONDITIONS.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-xs text-muted-foreground">
              Lingua
              <select
                className="mt-1 h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
              >
                {CT_LANGUAGES.map((l) => (
                  <option key={l} value={l}>
                    {l.toUpperCase()}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <p className="text-xs text-muted-foreground">
            Prezzo suggerito dal valore di mercato registrato per questa condizione/grade:{" "}
            {value != null ? `${value} €` : "dato da completare"}. Nessuna pubblicazione avviene senza la tua
            conferma.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            disabled={!blueprintId || !price || publish.isPending}
            onClick={() => publish.mutate()}
          >
            {listing?.listing_id ? "Ripubblica" : "Pubblica inserzione"}
          </Button>
          {listing?.listing_id ? (
            <>
              <Button variant="outline" disabled={update.isPending} onClick={() => update.mutate()}>
                Aggiorna prezzo/quantità
              </Button>
              <Button variant="ghost" disabled={remove.isPending} onClick={() => remove.mutate()}>
                <Trash2 className="mr-1 h-4 w-4" /> Rimuovi
              </Button>
            </>
          ) : null}
          <Button asChild variant="ghost">
            <a
              href={
                blueprintId
                  ? `https://www.cardtrader.com/cards/${blueprintId}`
                  : "https://www.cardtrader.com"
              }
              target="_blank"
              rel="noreferrer"
            >
              <ExternalLink className="mr-1 h-4 w-4" /> Apri su CardTrader
            </a>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
