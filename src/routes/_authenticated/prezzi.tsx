import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { PriceChart } from "@/components/PriceChart";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { itemsQuery } from "@/lib/queries";
import { addPrice } from "@/lib/mutations";
import { dateIt, eur, itemTitle, priceHistory } from "@/lib/calc";
import { PRICE_TYPES, type PriceType } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { formatObservedAt, latestValuePrice, priceFreshness } from "@/lib/analytics";
import { isPriceSourceConfigured, priceSourceQuery } from "@/lib/priceSource";

export const Route = createFileRoute("/_authenticated/prezzi")({
  head: () => ({
    meta: [
      { title: "Storico prezzi — Pokémon Collection Manager" },
      { name: "description", content: "Storico dei valori di mercato raw, PSA e sealed per item." },
      { property: "og:title", content: "Storico prezzi — Pokémon Collection Manager" },
      { property: "og:description", content: "Grafico e registro completo dei valori di mercato." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PrezziPage,
});

function PrezziPage() {
  const { data: items } = useSuspenseQuery(itemsQuery());
  const qc = useQueryClient();
  const [itemId, setItemId] = useState(items[0]?.id ?? "");
  const [type, setType] = useState<PriceType>("RAW");
  const [value, setValue] = useState("");
  const [source, setSource] = useState("Manuale");
  const { data: priceSource = null } = useQuery(priceSourceQuery());

  const selected = useMemo(() => items.find((i) => i.id === itemId) ?? null, [items, itemId]);
  const history = selected ? priceHistory(selected) : [];

  const add = useMutation({
    mutationFn: () =>
      addPrice({ itemId, price_type: type, value: Number(value || 0), source }),
    onSuccess: () => {
      qc.invalidateQueries();
      setValue("");
      toast.success("Valore registrato");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <AppShell title="Storico prezzi" subtitle="Valori di mercato per item">
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Aggiungi prima una carta o un prodotto sealed.
        </p>
      ) : (
        <div className="space-y-4">
          <Card>
            <CardContent className="flex flex-wrap items-center gap-3 py-4 text-sm">
              {isPriceSourceConfigured(priceSource) ? (
                <Badge>Fonte prezzi: {priceSource!.provider}</Badge>
              ) : (
                <Badge variant="destructive">Fonte prezzi non configurata</Badge>
              )}
              <span className="text-xs text-muted-foreground">
                L'aggiornamento automatico giornaliero è pronto: aggiunge sempre nuove rilevazioni
                senza sovrascrivere lo storico e non stima mai valori.
              </span>
              {selected ? (
                <span className="text-xs text-muted-foreground">
                  {itemTitle(selected)}: {priceFreshness(selected).label} ·{" "}
                  {formatObservedAt(latestValuePrice(selected))}
                </span>
              ) : null}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Aggiungi valore</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
              <div className="space-y-1.5 lg:col-span-2">
                <Label>Item</Label>
                <select
                  className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                  value={itemId}
                  onChange={(e) => setItemId(e.target.value)}
                >
                  {items.map((i) => (
                    <option key={i.id} value={i.id}>
                      {itemTitle(i)}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label>Tipo</Label>
                <select
                  className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                  value={type}
                  onChange={(e) => setType(e.target.value as PriceType)}
                >
                  {PRICE_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label>Valore (€)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Fonte</Label>
                <Input value={source} onChange={(e) => setSource(e.target.value)} />
              </div>
              <div className="lg:col-span-5">
                <Button
                  disabled={!itemId || !value || add.isPending}
                  onClick={() => add.mutate()}
                >
                  Registra valore
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                {selected ? itemTitle(selected) : "Andamento"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <PriceChart rows={history} />
            </CardContent>
          </Card>

          <div className="overflow-x-auto rounded-lg border border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Fonte</TableHead>
                  <TableHead className="text-right">Valore</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {history.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-sm text-muted-foreground">
                      Nessun valore registrato per questo item.
                    </TableCell>
                  </TableRow>
                ) : (
                  [...history].reverse().map((p) => (
                    <TableRow key={p.id}>
                      <TableCell>{dateIt(p.observed_at)}</TableCell>
                      <TableCell>{p.price_type}</TableCell>
                      <TableCell>{p.source ?? "—"}</TableCell>
                      <TableCell className="text-right">{eur(p.value)}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      )}
    </AppShell>
  );
}
