import { useMemo } from "react";
import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useQuery, useSuspenseQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { CardDetailDialog } from "@/components/CardDetailDialog";
import { ItemPhoto } from "@/components/ItemPhoto";
import { itemsQuery } from "@/lib/queries";
import { ALMOST_COMPLETE, buildCollection } from "@/lib/collection";
import { eur } from "@/lib/calc";
import { stockImageFor, stockSetQuery } from "@/lib/stockImages";
import { getCard, getCoverImage } from "@/lib/types";

export const Route = createFileRoute("/_authenticated/collezione/$setKey")({
  head: () => ({
    meta: [
      { title: "Dettaglio set — TCG Vault" },
      {
        name: "description",
        content: "Griglia del set con carte possedute, slot mancanti, valore e doppioni.",
      },
      { property: "og:title", content: "Dettaglio set — TCG Vault" },
      {
        property: "og:description",
        content: "Progresso del set, carte possedute e slot mancanti in posizione.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SetDetailPage,
});

function SetDetailPage() {
  const { setKey } = useParams({ from: "/_authenticated/collezione/$setKey" });
  const key = decodeURIComponent(setKey);
  const { data: items } = useSuspenseQuery(itemsQuery());
  const set = useMemo(() => buildCollection(items).find((s) => s.key === key) ?? null, [items, key]);

  if (!set) {
    return (
      <AppShell title="Set non trovato">
        <p className="text-sm text-muted-foreground">
          Questo set non è più presente nella tua collezione.
        </p>
        <Button asChild className="mt-4">
          <Link to="/collezione">Torna alla Collezione</Link>
        </Button>
      </AppShell>
    );
  }

  return (
    <AppShell
      title={set.setName}
      subtitle={[set.setCode, set.year, set.languages.join("/")].filter(Boolean).join(" · ")}
      actions={
        <Button asChild variant="outline" size="sm">
          <Link to="/collezione">
            <ArrowLeft className="mr-1 h-4 w-4" /> Set
          </Link>
        </Button>
      }
    >
      <Card>
        <CardContent className="space-y-3 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-lg font-semibold">
              {set.ownedUnique} / {set.total ?? "?"}
            </span>
            <div className="flex items-center gap-2">
              {set.percent != null && set.percent >= ALMOST_COMPLETE && set.percent < 100 ? (
                <Badge>Completa set</Badge>
              ) : null}
              <span className="text-sm text-muted-foreground">
                {set.percent == null
                  ? "Totale set non disponibile nei dati"
                  : `${set.percent.toFixed(0)}%`}
              </span>
            </div>
          </div>
          <Progress value={set.percent ?? 0} />
          <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
            <Metric label="Valore set" value={set.value > 0 ? eur(set.value) : "Da completare"} />
            <Metric label="Costo copie" value={set.cost > 0 ? eur(set.cost) : "Da completare"} />
            <Metric
              label="P/L non realizzato"
              value={set.value > 0 || set.cost > 0 ? eur(set.unrealized) : "Da completare"}
            />
            <Metric label="Doppioni" value={String(set.duplicates)} />
          </div>
          {set.total == null ? (
            <p className="rounded-md bg-muted/40 p-2 text-xs text-muted-foreground">
              Checklist completa non disponibile: il progresso è calcolato solo sui dati presenti.
            </p>
          ) : null}
        </CardContent>
      </Card>

      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6">
        {set.slots.map((slot) => {
          if (!slot.owned) {
            return (
              <div
                key={slot.key}
                className="rounded-lg border border-dashed border-border/60 bg-muted/20 p-2 opacity-60"
              >
                <div className="aspect-[63/88] w-full rounded-md bg-background/40" />
                <p className="mt-2 text-center text-xs text-muted-foreground">#{slot.number}</p>
              </div>
            );
          }
          const item = slot.items[0]!;
          const card = getCard(item);
          return (
            <CardDetailDialog
              key={slot.key}
              item={item}
              trigger={
                <button
                  type="button"
                  className="rounded-lg border border-border bg-card p-2 text-left transition-colors hover:border-primary/60"
                >
                  <div className="relative">
                    <ItemPhoto
                      image={getCoverImage(item)}
                      alt={card?.card_name || card?.pokemon_name || "Carta"}
                      className="aspect-[63/88] w-full"
                    />
                    {slot.items.length > 1 ? (
                      <Badge className="absolute right-1 top-1">x{slot.items.length}</Badge>
                    ) : null}
                  </div>
                  <p className="mt-2 truncate text-xs font-medium">
                    {card?.card_name || card?.pokemon_name || "Carta"}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    {slot.number ? `#${slot.number}` : "Numero da completare"}
                  </p>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {card?.reverse_holo ? (
                      <Badge variant="outline" className="px-1 py-0 text-[10px]">
                        Reverse
                      </Badge>
                    ) : card?.holo ? (
                      <Badge variant="outline" className="px-1 py-0 text-[10px]">
                        Holo
                      </Badge>
                    ) : null}
                    {card?.first_edition ? (
                      <Badge variant="outline" className="px-1 py-0 text-[10px]">
                        1st
                      </Badge>
                    ) : null}
                    {card?.language ? (
                      <Badge variant="secondary" className="px-1 py-0 text-[10px]">
                        {card.language}
                      </Badge>
                    ) : null}
                  </div>
                </button>
              }
            />
          );
        })}
      </div>

      {set.duplicates > 0 ? (
        <p className="mt-4 text-xs text-muted-foreground">
          I doppioni non aumentano il progresso: apri lo slot con badge xN per vedere le copie
          nell'Inventario.
        </p>
      ) : null}
    </AppShell>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-muted/40 p-2">
      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-0.5 font-semibold">{value}</p>
    </div>
  );
}
