import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { AppShell } from "@/components/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { itemsQuery } from "@/lib/queries";
import {
  buildPortfolio,
  currentValue,
  eur,
  itemSubtitle,
  itemTitle,
  pct,
  roi,
} from "@/lib/calc";
import { exportCsv, exportJson } from "@/lib/exporters";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — Pokémon Collection Manager" },
      {
        name: "description",
        content: "Metriche reali della collezione: capitale investito, valore, profitti e ROI.",
      },
      { property: "og:title", content: "Dashboard — Pokémon Collection Manager" },
      { property: "og:description", content: "Capitale investito, valore corrente, profitti e ROI." },
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
                <div key={i.id} className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
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
                <div key={i.id} className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{itemTitle(i)}</p>
                    <p className="truncate text-xs text-muted-foreground">{itemSubtitle(i)}</p>
                  </div>
                  <Badge variant={(roi(i) ?? 0) >= 0 ? "default" : "destructive"}>
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
