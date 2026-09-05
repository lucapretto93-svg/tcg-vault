import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { AppShell } from "@/components/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { itemsQuery } from "@/lib/queries";
import { buildPortfolio, currentValue, eur, itemSubtitle, itemTitle, pct, roi } from "@/lib/calc";
import { exportCsv, exportJson } from "@/lib/exporters";
import { ItemPhoto } from "@/components/ItemPhoto";
import { getCoverImage } from "@/lib/types";
import { Activity, Database, ScanLine, ShieldCheck } from "lucide-react";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — Pokémon Collection Manager" },
      {
        name: "description",
        content: "Metriche reali della collezione: capitale investito, valore, profitti e ROI.",
      },
      { property: "og:title", content: "Dashboard — Pokémon Collection Manager" },
      {
        property: "og:description",
        content: "Capitale investito, valore corrente, profitti e ROI.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: DashboardPage,
});

function Metric({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-semibold tracking-tight">{value}</p>
        {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
      </CardContent>
    </Card>
  );
}

function DashboardPage() {
  const { data: items } = useSuspenseQuery(itemsQuery());
  const p = buildPortfolio(items);

  return (
    <AppShell
      title="Dashboard"
      subtitle="Panoramica della collezione"
      actions={
        <>
          <Button variant="outline" size="sm" onClick={() => exportJson(items)}>
            JSON
          </Button>
          <Button variant="outline" size="sm" onClick={() => exportCsv(items)}>
            CSV
          </Button>
        </>
      }
    >
      <section className="pokedex-console mb-5 overflow-hidden rounded-2xl border border-red-500/25 p-4 sm:p-5">
        <div className="relative z-10 flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-red-300">
              <ScanLine className="h-4 w-4" /> Archivio online
            </div>
            <h2 className="text-2xl font-black tracking-tight sm:text-3xl">
              Scansiona. Valuta. Decidi.
            </h2>
            <p className="mt-2 max-w-xl text-sm text-muted-foreground">
              Il tuo centro di controllo per collezione, grading, acquisti e vendite.
            </p>
          </div>
          <div className="pokedex-screen grid min-w-[190px] grid-cols-2 gap-3 rounded-xl p-3 text-xs">
            <div className="flex items-center gap-2">
              <Database className="h-4 w-4 text-cyan-300" /> Database
            </div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-emerald-300" /> Protetto
            </div>
            <div className="col-span-2 flex items-center gap-2 border-t border-cyan-300/15 pt-2 text-cyan-200">
              <Activity className="h-4 w-4" /> {items.length} oggetti sincronizzati
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="Carte" value={String(p.cardCount)} hint="in collezione" />
        <Metric label="Sealed" value={String(p.sealedCount)} hint="pezzi totali" />
        <Metric label="Capitale investito" value={eur(p.invested)} />
        <Metric label="Valore corrente" value={eur(p.currentValue)} />
        <Metric label="Profitto realizzato" value={eur(p.realized)} />
        <Metric label="Profitto non realizzato" value={eur(p.unrealized)} />
        <Metric label="ROI complessivo" value={pct(p.roi)} />
        <Metric label="Da gradare" value={String(p.toGrade.length)} hint="uplift atteso positivo" />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Top per valore</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {p.topByValue.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nessun dato disponibile.</p>
            ) : (
              p.topByValue.map((i) => (
                <div key={i.id} className="flex items-center gap-3">
                  <ItemPhoto
                    image={getCoverImage(i)}
                    alt={itemTitle(i)}
                    className="h-16 w-12 shrink-0 bg-muted/30 object-contain"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{itemTitle(i)}</p>
                    <p className="truncate text-xs text-muted-foreground">{itemSubtitle(i)}</p>
                  </div>
                  <span className="shrink-0 text-sm font-semibold">{eur(currentValue(i))}</span>
                </div>
              ))
            )}

          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Top per ROI</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {p.topByRoi.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nessun dato disponibile.</p>
            ) : (
              p.topByRoi.map((i) => (
                <div key={i.id} className="flex items-center gap-3">
                  <ItemPhoto
                    image={getCoverImage(i)}
                    alt={itemTitle(i)}
                    className="h-16 w-12 shrink-0 bg-muted/30 object-contain"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{itemTitle(i)}</p>
                    <p className="truncate text-xs text-muted-foreground">{itemSubtitle(i)}</p>
                  </div>
                  <Badge
                    className="shrink-0"
                    variant={(roi(i) ?? 0) >= 0 ? "default" : "destructive"}
                  >
                    {pct(roi(i))}
                  </Badge>
                </div>

              ))
            )}
          </CardContent>
        </Card>
      </div>

      <div className="mt-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Carte da gradare</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {p.toGrade.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Nessun candidato. Aggiungi valutazioni di grading e valori PSA.
              </p>
            ) : (
              p.toGrade.slice(0, 8).map((i) => (
                <div key={i.id} className="flex items-center justify-between gap-3">
                  <p className="truncate text-sm">{itemTitle(i)}</p>
                  <Link to="/grading" className="text-xs text-primary hover:underline">
                    Vedi grading
                  </Link>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
