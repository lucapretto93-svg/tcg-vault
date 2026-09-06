import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { SealedFormDialog } from "@/components/SealedFormDialog";
import { EbaySellButton } from "@/components/EbaySellButton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { itemsQuery } from "@/lib/queries";
import { deleteItem } from "@/lib/mutations";
import { currentValue, eur, itemSubtitle, itemTitle, pct, roi, totalCost } from "@/lib/calc";
import type { ItemRow } from "@/lib/types";

export const Route = createFileRoute("/_authenticated/sealed")({
  head: () => ({
    meta: [
      { title: "Sealed — Pokémon Collection Manager" },
      { name: "description", content: "Prodotti sigillati: ETB, booster box, bundle e altro." },
      { property: "og:title", content: "Sealed — Pokémon Collection Manager" },
      { property: "og:description", content: "Gestisci i prodotti sigillati della collezione." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SealedPage,
});

function SealedPage() {
  const { data: items } = useSuspenseQuery(itemsQuery());
  const qc = useQueryClient();
  const [q, setQ] = useState("");

  const del = useMutation({
    mutationFn: deleteItem,
    onSuccess: () => {
      qc.invalidateQueries();
      toast.success("Elemento eliminato");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const rows = useMemo(() => {
    const term = q.trim().toLowerCase();
    return items
      .filter((i) => i.item_type === "SEALED")
      .filter((i) =>
        term ? `${itemTitle(i)} ${itemSubtitle(i)}`.toLowerCase().includes(term) : true,
      );
  }, [items, q]);

  const remove = (item: ItemRow) => {
    if (confirm(`Eliminare "${itemTitle(item)}"?`)) del.mutate(item.id);
  };

  return (
    <AppShell
      title="Sealed"
      subtitle={`${rows.length} prodotti`}
      actions={
        <SealedFormDialog
          trigger={
            <Button size="sm">
              <Plus className="mr-1 h-4 w-4" /> Nuovo prodotto
            </Button>
          }
        />
      }
    >
      <div className="mb-4">
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Cerca prodotto…"
          className="max-w-xs"
        />
      </div>

      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nessun prodotto sealed.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Prodotto</TableHead>
                <TableHead>Stato</TableHead>
                <TableHead className="text-right">Qtà</TableHead>
                <TableHead className="text-right">Costo</TableHead>
                <TableHead className="text-right">Valore</TableHead>
                <TableHead className="text-right">ROI</TableHead>
                <TableHead className="w-24" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((i) => (
                <TableRow key={i.id}>
                  <TableCell>
                    <p className="font-medium">{itemTitle(i)}</p>
                    <p className="text-xs text-muted-foreground">{itemSubtitle(i)}</p>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">{i.status}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {i.sealed_products[0]?.quantity ?? 1}
                  </TableCell>
                  <TableCell className="text-right">{eur(totalCost(i))}</TableCell>
                  <TableCell className="text-right">{eur(currentValue(i))}</TableCell>
                  <TableCell className="text-right">{pct(roi(i))}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap items-center justify-end gap-1">
                      {i.status !== "SOLD" ? <EbaySellButton item={i} size="sm" /> : null}
                      <SealedFormDialog
                        item={i}
                        trigger={
                          <Button variant="ghost" size="icon">
                            <Pencil className="h-4 w-4" />
                          </Button>
                        }
                      />
                      <Button variant="ghost" size="icon" onClick={() => remove(i)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </AppShell>
  );
}
