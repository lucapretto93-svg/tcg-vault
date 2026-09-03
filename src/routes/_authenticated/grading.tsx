import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { AppShell } from "@/components/AppShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { GradingResultDialog } from "@/components/GradingResultDialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { itemsQuery } from "@/lib/queries";
import {
  currentValue,
  eur,
  expectedGradedValue,
  expectedProfit,
  expectedUplift,
  gradingCost,
  itemSubtitle,
  itemTitle,
  latestGrading,
} from "@/lib/calc";

export const Route = createFileRoute("/_authenticated/grading")({
  head: () => ({
    meta: [
      { title: "Grading — Pokémon Collection Manager" },
      {
        name: "description",
        content:
          "Valutazioni di grading con probabilità PSA 6-10, expected value e profitto atteso.",
      },
      { property: "og:title", content: "Grading — Pokémon Collection Manager" },
      { property: "og:description", content: "Probabilità PSA, uplift e profitto atteso." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: GradingPage,
});

function GradingPage() {
  const { data: items } = useSuspenseQuery(itemsQuery());
  const rows = items.filter((i) => i.grading_assessments.length > 0);

  return (
    <AppShell title="Grading" subtitle={`${rows.length} valutazioni`}>
      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nessuna valutazione di grading registrata.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Carta</TableHead>
                <TableHead>Company</TableHead>
                <TableHead>Probabile</TableHead>
                <TableHead>Effettivo</TableHead>
                <TableHead>Scarto</TableHead>
                <TableHead>PSA 6/7/8/9/10</TableHead>
                <TableHead>Raccomandazione</TableHead>
                <TableHead className="text-right">Valore raw</TableHead>
                <TableHead className="text-right">Expected graded</TableHead>
                <TableHead className="text-right">Costo grading</TableHead>
                <TableHead className="text-right">Uplift</TableHead>
                <TableHead className="text-right">Profitto atteso</TableHead>
                <TableHead>Risultato</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((i) => {
                const g = latestGrading(i);
                return (
                  <TableRow key={i.id}>
                    <TableCell>
                      <p className="font-medium">{itemTitle(i)}</p>
                      <p className="text-xs text-muted-foreground">{itemSubtitle(i)}</p>
                    </TableCell>
                    <TableCell>{g?.grading_company ?? "—"}</TableCell>
                    <TableCell>{g?.probable_grade ?? "—"}</TableCell>
                    <TableCell>{g?.actual_grade ?? "—"}</TableCell>
                    <TableCell>
                      {g?.actual_grade !== null &&
                      g?.actual_grade !== undefined &&
                      g?.probable_grade !== null
                        ? `${Number(g.actual_grade) - Number(g.probable_grade) >= 0 ? "+" : ""}${Number(g.actual_grade) - Number(g.probable_grade)}`
                        : "—"}
                    </TableCell>
                    <TableCell className="text-xs">
                      {g
                        ? `${g.prob_psa6}/${g.prob_psa7}/${g.prob_psa8}/${g.prob_psa9}/${g.prob_psa10}`
                        : "—"}
                    </TableCell>
                    <TableCell>
                      {g?.recommendation ? (
                        <Badge variant={g.recommendation === "GRADA" ? "default" : "secondary"}>
                          {g.recommendation}
                        </Badge>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell className="text-right">{eur(currentValue(i))}</TableCell>
                    <TableCell className="text-right">{eur(expectedGradedValue(i))}</TableCell>
                    <TableCell className="text-right">{eur(gradingCost(i))}</TableCell>
                    <TableCell className="text-right">{eur(expectedUplift(i))}</TableCell>
                    <TableCell className="text-right">{eur(expectedProfit(i))}</TableCell>
                    <TableCell>
                      {g ? (
                        <GradingResultDialog
                          grading={g}
                          trigger={
                            <Button size="sm" variant="outline">
                              {g.actual_grade ? "Modifica risultato" : "Registra risultato"}
                            </Button>
                          }
                        />
                      ) : null}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </AppShell>
  );
}
