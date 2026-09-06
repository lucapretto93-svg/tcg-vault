import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { AppShell } from "@/components/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { itemsQuery } from "@/lib/queries";
import { buildPortfolio, currentValue, eur, itemSubtitle, itemTitle, pct, roi } from "@/lib/calc";
import { exportCsv, exportJson } from "@/lib/exporters";
import { ItemPhoto } from "@/components/ItemPhoto";
import { DECISION_LABELS, INVESTMENT_DECISIONS, getLatestDecision, getCoverImage } from "@/lib/types";
import { buildSetProgress, setCompletionTargets } from "@/lib/setProgress";
import { Activity, Database, ScanLine, ShieldCheck } from "lucide-react";
import { PortfolioChart } from "@/components/PortfolioChart";
import { CardtraderRadar } from "@/components/CardtraderRadar";
import { MoveList } from "@/components/MoveList";
import { buildMoves } from "@/lib/actions";
import {
  buildAlerts,
  incompleteItems,
  movers,
  priceFreshness,
  segmentValues,
} from "@/lib/analytics";
import {
  filterRange,
  portfolioDailyChange,
  snapshotsQuery,
  upsertTodaySnapshot,
  type RangeKey,
} from "@/lib/portfolio";
import { isPriceSourceConfigured, priceSourceQuery } from "@/lib/priceSource";

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
  const qc = useQueryClient();
  const { data: snapshots = [] } = useQuery(snapshotsQuery());
  const { data: priceSource = null } = useQuery(priceSourceQuery());
  const [range, setRange] = useState<RangeKey>("30G");

  const seg = useMemo(() => segmentValues(items), [items]);
  const mv = useMemo(() => movers(items), [items]);
  const alerts = useMemo(() => buildAlerts(items), [items]);
  const moves = useMemo(() => buildMoves(items), [items]);
  const incomplete = useMemo(() => incompleteItems(items), [items]);
  const stale = useMemo(
    () =>
      items.filter((i) => i.status !== "SOLD" && priceFreshness(i).status !== "FRESH").length,
    [items],
  );
  const chartRows = useMemo(() => filterRange(snapshots, range), [snapshots, range]);
  const daily = useMemo(() => portfolioDailyChange(snapshots), [snapshots]);

  // Snapshot giornaliero idempotente: una sola riga per giorno, storico mai sovrascritto.
  useEffect(() => {
    if (items.length === 0) return;
    upsertTodaySnapshot(items)
      .then(() => qc.invalidateQueries({ queryKey: ["portfolio_snapshots"] }))
      .catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items.length]);
  const p = buildPortfolio(items);
  const groups = buildSetProgress(items);
  const targets = setCompletionTargets(groups, 8);
  const decisionCounts = INVESTMENT_DECISIONS.map((d) => ({
    decision: d,
    count: items.filter((i) => getLatestDecision(i)?.decision === d).length,
  }));
  const senzaStrategia = items.filter((i) => i.status !== "SOLD" && !getLatestDecision(i)).length;

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

      <section className="mb-5">
        <Card>
          <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
            <div>
              <CardTitle className="text-base">Carte da muovere</CardTitle>
              <p className="text-xs text-muted-foreground">
                Prima da gradare o da vendere, ordinate per guadagno atteso.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary">{moves.length}</Badge>
              <Button asChild size="sm" className="min-h-11">
                <Link to="/da-muovere">Vedi tutte</Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <MoveList rows={moves.slice(0, 5)} />
          </CardContent>
        </Card>
      </section>

      <section className="mb-5">
        <CardtraderRadar limit={5} />
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


      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <CardTitle className="text-base">Storico portafoglio</CardTitle>
              <div className="flex gap-1">
                {(["7G", "30G", "90G", "1A"] as RangeKey[]).map((r) => (
                  <Button
                    key={r}
                    size="sm"
                    variant={range === r ? "default" : "outline"}
                    className="h-8 px-2 text-xs"
                    onClick={() => setRange(r)}
                  >
                    {r}
                  </Button>
                ))}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <PortfolioChart rows={chartRows} />
            <p className="mt-2 text-xs text-muted-foreground">
              {daily
                ? `Variazione ultimo giorno: ${daily.abs >= 0 ? "+" : ""}${eur(daily.abs)}${
                    daily.pct == null ? "" : ` (${pct(daily.pct)})`
                  }`
                : "Variazione giornaliera disponibile dal secondo giorno di rilevazioni."}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Segmenti</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between"><span>Raw</span><span>{eur(seg.raw)}</span></div>
            <div className="flex justify-between"><span>Slab</span><span>{eur(seg.slab)}</span></div>
            <div className="flex justify-between"><span>Sealed</span><span>{eur(seg.sealed)}</span></div>
            <div className="flex justify-between border-t border-border pt-2 font-semibold">
              <span>Totale</span><span>{eur(seg.total)}</span>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span>Collezione</span>
              <span>{items.filter((i) => i.bucket !== "STOCK" && i.status !== "SOLD").length}</span>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span>Stock da vendere</span>
              <span>{items.filter((i) => i.bucket === "STOCK" && i.status !== "SOLD").length}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Top gainers</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {mv.gainers.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Nessun rialzo: servono almeno due rilevazioni di prezzo.
              </p>
            ) : (
              mv.gainers.map(({ item, change }) => (
                <div key={item.id} className="flex items-center justify-between gap-2 text-sm">
                  <span className="truncate">{itemTitle(item)}</span>
                  <Badge>{`+${eur(change.abs)}`}</Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Top losers</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {mv.losers.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nessun calo rilevato.</p>
            ) : (
              mv.losers.map(({ item, change }) => (
                <div key={item.id} className="flex items-center justify-between gap-2 text-sm">
                  <span className="truncate">{itemTitle(item)}</span>
                  <Badge variant="destructive">{eur(change.abs)}</Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Avvisi</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {alerts.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nessun avviso attivo.</p>
            ) : (
              alerts.slice(0, 8).map((a) => (
                <div key={a.id} className="text-sm">
                  <div className="flex items-center gap-2">
                    <Badge variant={a.level === "WARN" ? "destructive" : "default"}>
                      {a.title}
                    </Badge>
                  </div>
                  <p className="truncate text-xs text-muted-foreground">
                    {itemTitle(a.item)} — {a.detail}
                  </p>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Dati da completare</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {incomplete.length === 0 ? (
              <p className="text-sm text-muted-foreground">Tutte le schede sono complete.</p>
            ) : (
              incomplete.slice(0, 8).map((row) => (
                <div key={row.item.id} className="flex items-center justify-between gap-2 text-sm">
                  <span className="truncate">{itemTitle(row.item)}</span>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {row.missing.join(", ")}
                  </span>
                </div>
              ))
            )}
            <div className="flex flex-wrap gap-2 pt-2">
              <Button asChild size="sm" variant="outline">
                <Link to="/carte">Apri carte</Link>
              </Button>
              <Button asChild size="sm" variant="outline">
                <Link to="/prezzi">Aggiorna prezzi</Link>
              </Button>
              <Button asChild size="sm" variant="outline">
                <Link to="/set-progress">Set progress</Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Fonte prezzi</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {isPriceSourceConfigured(priceSource) ? (
              <>
                <Badge>Fonte attiva: {priceSource!.provider}</Badge>
                <p className="text-xs text-muted-foreground">
                  Ultimo aggiornamento: {priceSource!.last_run_at ?? "mai eseguito"}
                </p>
              </>
            ) : (
              <>
                <Badge variant="destructive">Fonte prezzi non configurata</Badge>
                <p className="text-xs text-muted-foreground">
                  L'aggiornamento automatico è pronto ma non scrive nulla finché non colleghi una
                  fonte autorizzata. I prezzi restano quelli inseriti manualmente.
                </p>
              </>
            )}
            <p className="text-xs text-muted-foreground">
              {stale} oggetti con prezzo non aggiornato o mai prezzato.
            </p>
          </CardContent>
        </Card>
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

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Strategie attive</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {decisionCounts.map(({ decision, count }) => (
              <div key={decision} className="flex items-center justify-between text-sm">
                <span>{DECISION_LABELS[decision]}</span>
                <Badge variant={count > 0 ? "default" : "outline"}>{count}</Badge>
              </div>
            ))}
            <p className="pt-2 text-xs text-muted-foreground">
              {senzaStrategia > 0
                ? `${senzaStrategia} elementi senza strategia: da completare.`
                : "Tutti gli elementi hanno una strategia."}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-2">
              <CardTitle className="text-base">Set quasi completi</CardTitle>
              <Link to="/set-progress" className="text-xs text-primary hover:underline">
                Vedi tutti
              </Link>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {targets.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Nessun set vicino al completamento. Aggiungi set, numero e totale alle carte.
              </p>
            ) : (
              targets.map((t) => (
                <div
                  key={`${t.group.key}-${t.number}`}
                  className="flex items-center justify-between gap-3 text-sm"
                >
                  <span className="truncate">
                    {t.group.setName} — #{t.number}
                  </span>
                  <Badge variant="secondary" className="shrink-0">
                    {t.priority}
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
