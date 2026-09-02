import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { AppShell } from "@/components/AppShell";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { purchasesQuery } from "@/lib/queries";
import { dateIt, eur } from "@/lib/calc";

export const Route = createFileRoute("/_authenticated/acquisti")({
  head: () => ({
    meta: [
      { title: "Acquisti — Pokémon Collection Manager" },
      { name: "description", content: "Storico acquisti e lotti con costi, spedizione, fee e tasse." },
      { property: "og:title", content: "Acquisti — Pokémon Collection Manager" },
      { property: "og:description", content: "Registro completo degli acquisti della collezione." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AcquistiPage,
});

function AcquistiPage() {
  const { data: purchases } = useSuspenseQuery(purchasesQuery());
  const total = purchases.reduce((s, p) => s + Number(p.total_cost || 0), 0);

  return (
    <AppShell title="Acquisti" subtitle={`${purchases.length} operazioni · ${eur(total)} spesi`}>
      {purchases.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Nessun acquisto registrato. Aggiungi una carta o un sealed indicando il prezzo d'acquisto.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Piattaforma</TableHead>
                <TableHead>Venditore</TableHead>
                <TableHead className="text-right">Prezzo</TableHead>
                <TableHead className="text-right">Spedizione</TableHead>
                <TableHead className="text-right">Fees</TableHead>
                <TableHead className="text-right">Tasse</TableHead>
                <TableHead className="text-right">Totale</TableHead>
                <TableHead className="text-right">Pezzi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {purchases.map((p) => (
                <TableRow key={p.id}>
                  <TableCell>{dateIt(p.purchase_date)}</TableCell>
                  <TableCell>{p.platform ?? "—"}</TableCell>
                  <TableCell>{p.seller ?? "—"}</TableCell>
                  <TableCell className="text-right">{eur(p.item_price)}</TableCell>
                  <TableCell className="text-right">{eur(p.shipping)}</TableCell>
                  <TableCell className="text-right">{eur(p.fees)}</TableCell>
                  <TableCell className="text-right">{eur(p.taxes)}</TableCell>
                  <TableCell className="text-right font-medium">{eur(p.total_cost)}</TableCell>
                  <TableCell className="text-right">{p.purchase_items?.length ?? 0}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </AppShell>
  );
}
