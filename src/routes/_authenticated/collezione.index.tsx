import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { ItemPhoto } from "@/components/ItemPhoto";
import { itemsQuery } from "@/lib/queries";
import { ALMOST_COMPLETE, buildCollection } from "@/lib/collection";
import { eur } from "@/lib/calc";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/collezione/")({
  head: () => ({
    meta: [
      { title: "Collezione per set — TCG Vault" },
      {
        name: "description",
        content: "Esplora la collezione organizzata per set: completamento, valore e carte mancanti.",
      },
      { property: "og:title", content: "Collezione per set — TCG Vault" },
      {
        property: "og:description",
        content: "Vista visuale dei set posseduti con percentuale di completamento e valore.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: CollezionePage,
});

type Filter = "TUTTI" | "VINTAGE" | "MODERNI" | "COMPLETATI";
type Sort = "PERCENT" | "ANNO" | "VALORE";

const FILTERS: { key: Filter; label: string }[] = [
  { key: "TUTTI", label: "Tutti" },
  { key: "VINTAGE", label: "WOTC / Vintage" },
  { key: "MODERNI", label: "Moderni" },
  { key: "COMPLETATI", label: "Completati" },
];

const SORTS: { key: Sort; label: string }[] = [
  { key: "PERCENT", label: "% completamento" },
  { key: "ANNO", label: "Anno" },
  { key: "VALORE", label: "Valore" },
];

function CollezionePage() {
  const { data: items } = useSuspenseQuery(itemsQuery());
  const sets = useMemo(() => buildCollection(items), [items]);
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<Filter>("TUTTI");
  const [sort, setSort] = useState<Sort>("PERCENT");

  const visible = useMemo(() => {
    const term = q.trim().toLowerCase();
    let list = sets;
    if (term) {
      list = list.filter((s) => `${s.setName} ${s.setCode ?? ""}`.toLowerCase().includes(term));
    }
    if (filter === "VINTAGE") list = list.filter((s) => s.vintage);
    if (filter === "MODERNI") list = list.filter((s) => s.year != null && !s.vintage);
    if (filter === "COMPLETATI") list = list.filter((s) => s.percent != null && s.percent >= 100);
    const sorted = [...list];
    if (sort === "ANNO") sorted.sort((a, b) => (b.year ?? -1) - (a.year ?? -1));
    if (sort === "VALORE") sorted.sort((a, b) => b.value - a.value);
    return sorted;
  }, [sets, q, filter, sort]);

  return (
    <AppShell
      title="Collezione"
      subtitle={`${sets.length} set · ${sets.reduce((a, s) => a + s.copies, 0)} copie`}
    >
      <div className="space-y-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Cerca set…"
            className="pl-9"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {FILTERS.map((f) => (
            <Button
              key={f.key}
              size="sm"
              variant={filter === f.key ? "default" : "outline"}
              onClick={() => setFilter(f.key)}
            >
              {f.label}
            </Button>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          {SORTS.map((s) => (
            <Button
              key={s.key}
              size="sm"
              variant={sort === s.key ? "secondary" : "ghost"}
              onClick={() => setSort(s.key)}
            >
              {s.label}
            </Button>
          ))}
        </div>
      </div>

      {visible.length === 0 ? (
        <p className="mt-8 text-sm text-muted-foreground">
          Nessun set trovato. Aggiungi il nome del set alle tue carte per vederle raggruppate qui.
        </p>
      ) : (
        <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {visible.map((s) => (
            <Link
              key={s.key}
              to="/collezione/$setKey"
              params={{ setKey: encodeURIComponent(s.key) }}
              className="block focus-visible:outline-none"
            >
              <Card className="h-full overflow-hidden transition-colors hover:border-primary/60">
                <div className="grid grid-cols-4 gap-1 bg-muted/30 p-2">
                  {Array.from({ length: 4 }).map((_, i) => {
                    const img = s.previews[i];
                    return img ? (
                      <ItemPhoto
                        key={img.id}
                        image={img}
                        alt={`${s.setName} anteprima ${i + 1}`}
                        className="aspect-[63/88] w-full"
                      />
                    ) : (
                      <div
                        key={`empty-${i}`}
                        className="aspect-[63/88] w-full rounded-lg border border-dashed border-border/60 bg-background/40"
                      />
                    );
                  })}
                </div>
                <CardContent className="space-y-3 p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate font-semibold">{s.setName}</p>
                      <p className="text-xs text-muted-foreground">
                        {[s.setCode, s.year, s.languages.join("/")].filter(Boolean).join(" · ") ||
                          "Metadati parziali"}
                      </p>
                    </div>
                    {s.percent != null && s.percent >= ALMOST_COMPLETE && s.percent < 100 ? (
                      <Badge className="shrink-0">Completa set</Badge>
                    ) : null}
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-semibold">
                      {s.ownedUnique} / {s.total ?? "?"}
                    </span>
                    <span
                      className={cn(
                        "text-muted-foreground",
                        s.percent != null && s.percent >= 100 && "text-emerald-400",
                      )}
                    >
                      {s.percent == null ? "Totale set non noto" : `${s.percent.toFixed(0)}%`}
                    </span>
                  </div>
                  <Progress value={s.percent ?? 0} />
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Valore {s.value > 0 ? eur(s.value) : "Da completare"}</span>
                    <span>
                      {s.copies} copie{s.duplicates > 0 ? ` · ${s.duplicates} doppioni` : ""}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </AppShell>
  );
}
