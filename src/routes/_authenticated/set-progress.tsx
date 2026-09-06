import { useMemo } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { AppShell } from "@/components/AppShell";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { itemsQuery } from "@/lib/queries";
import { buildSetProgress, completionCost, setCompletionTargets } from "@/lib/setProgress";
import { eur } from "@/lib/calc";

export const Route = createFileRoute("/_authenticated/set-progress")({
  head: () => ({
    meta: [
      { title: "Set Progress — Pokémon Collection Manager" },
      {
        name: "description",
        content: "Completamento dei set: carte possedute, totale, percentuale e carte mancanti.",
      },
      { property: "og:title", content: "Set Progress — Pokémon Collection Manager" },
      {
        property: "og:description",
        content: "Percentuale di completamento per set e radar delle carte mancanti.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SetProgressPage,
});

function SetProgressPage() {
  const { data: items } = useSuspenseQuery(itemsQuery());
  const groups = useMemo(() => buildSetProgress(items), [items]);
  const targets = useMemo(() => setCompletionTargets(groups), [groups]);

  return (
    <AppShell title="Set Progress" subtitle={`${groups.length} set monitorati`}>
      {groups.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Nessun set rilevato. Aggiungi set, numero e totale alle tue carte per vedere il
          completamento.
        </p>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {groups.map((g) => (
            <Card key={g.key}>
              <CardHeader className="pb-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <CardTitle className="text-base">{g.setName}</CardTitle>
                  {g.nearCompletion ? <Badge>SET COMPLETION</Badge> : null}
                </div>
                <p className="text-xs text-muted-foreground">
                  {[g.setCode, g.language, g.edition, g.variant].filter(Boolean).join(" · ")}
                </p>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-semibold">
                    {g.owned} / {g.total ?? "Totale da completare"}
                  </span>
                  <span className="text-muted-foreground">
                    {g.percent == null ? "—" : `${g.percent.toFixed(0)}%`}
                  </span>
                </div>
                <Progress value={g.percent ?? 0} />
                {(() => {
                  const cost = completionCost(g);
                  return (
                    <div className="rounded-md bg-muted/40 p-2 text-xs">
                      <p className="uppercase tracking-wide text-muted-foreground">
                        Costo stimato per completare
                      </p>
                      {cost.estimate == null ? (
                        <p className="mt-1">
                          Dato mancante: nessun prezzo disponibile per questo set.
                        </p>
                      ) : (
                        <p className="mt-1">
                          <span className="text-sm font-semibold">{eur(cost.estimate)}</span>{" "}
                          <span className="text-muted-foreground">
                            · {cost.missing} mancanti × {eur(cost.perCard)} (stima sui{" "}
                            {cost.pricedSamples} prezzi reali del set)
                          </span>
                        </p>
                      )}
                    </div>
                  );
                })()}
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Mancanti</p>
                  {g.total == null ? (
                    <p className="mt-1 text-sm">
                      Da completare: inserisci il totale del set nelle carte.
                    </p>
                  ) : g.missingNumbers.length === 0 ? (
                    <p className="mt-1 text-sm text-emerald-400">Set completo.</p>
                  ) : (
                    <div className="mt-1 flex flex-wrap gap-1">
                      {g.missingNumbers.slice(0, 40).map((n) => (
                        <Badge key={n} variant="outline">
                          #{n}
                        </Badge>
                      ))}
                      {g.missingNumbers.length > 40 ? (
                        <span className="text-xs text-muted-foreground">
                          +{g.missingNumbers.length - 40} altre
                        </span>
                      ) : null}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-base">Radar offerte — priorità SET COMPLETION</CardTitle>
        </CardHeader>
        <CardContent>
          {targets.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nessun set abbastanza vicino al completamento.
            </p>
          ) : (
            <ul className="space-y-2 text-sm">
              {targets.map((t) => (
                <li key={`${t.group.key}-${t.number}`} className="flex justify-between gap-3">
                  <span className="truncate">
                    {t.group.setName} · {t.group.language} — carta #{t.number}
                  </span>
                  <Badge variant="secondary" className="shrink-0">
                    {t.priority}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </AppShell>
  );
}
