import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { CardFormDialog } from "@/components/CardFormDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
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

export const Route = createFileRoute("/_authenticated/carte")({
  head: () => ({
    meta: [
      { title: "Carte — Pokémon Collection Manager" },
      { name: "description", content: "Elenco carte con ricerca, filtri, ordinamento e CRUD." },
      { property: "og:title", content: "Carte — Pokémon Collection Manager" },
      { property: "og:description", content: "Gestisci le tue carte Pokémon raw e gradate." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: CartePage,
});

type SortKey = "recent" | "value" | "roi" | "name";

function CartePage() {
  const { data: items } = useSuspenseQuery(itemsQuery());
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("TUTTI");
  const [sort, setSort] = useState<SortKey>("recent");
  const [view, setView] = useState<"table" | "cards">("table");

  const del = useMutation({
    mutationFn: deleteItem,
    onSuccess: () => {
      qc.invalidateQueries();
      toast.success("Elemento eliminato");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const rows = useMemo(() => {
    let list = items.filter((i) => i.item_type === "CARD");
    if (status !== "TUTTI") list = list.filter((i) => i.status === status);
    const term = q.trim().toLowerCase();
    if (term) {
      list = list.filter((i) =>
        `${itemTitle(i)} ${itemSubtitle(i)}`.toLowerCase().includes(term),
      );
    }
    const sorted = [...list];
    if (sort === "value") sorted.sort((a, b) => currentValue(b) - currentValue(a));
    if (sort === "roi") sorted.sort((a, b) => (roi(b) ?? -Infinity) - (roi(a) ?? -Infinity));
    if (sort === "name") sorted.sort((a, b) => itemTitle(a).localeCompare(itemTitle(b)));
    return sorted;
  }, [items, q, status, sort]);

  const remove = (item: ItemRow) => {
    if (confirm(`Eliminare "${itemTitle(item)}"? L'operazione è definitiva.`)) del.mutate(item.id);
  };

  return (
    <AppShell
      title="Carte"
      subtitle={`${rows.length} carte`}
      actions={
        <CardFormDialog
          trigger={
            <Button size="sm">
              <Plus className="mr-1 h-4 w-4" /> Nuova carta
            </Button>
          }
        />
      }
    >
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Cerca per nome, set, numero…"
          className="max-w-xs"
        />
        <select
          className="h-9 rounded-md border border-input bg-background px-3 text-sm"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          {["TUTTI", "OWNED", "GRADING", "LISTED", "SOLD"].map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <select
          className="h-9 rounded-md border border-input bg-background px-3 text-sm"
          value={sort}
          onChange={(e) => setSort(e.target.value as SortKey)}
        >
          <option value="recent">Più recenti</option>
          <option value="value">Valore</option>
          <option value="roi">ROI</option>
          <option value="name">Nome</option>
        </select>
        <Button variant="outline" size="sm" onClick={() => setView(view === "table" ? "cards" : "table")}>
          {view === "table" ? "Vista card" : "Vista tabella"}
        </Button>
      </div>

      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nessuna carta trovata.</p>
      ) : view === "table" ? (
        <div className="overflow-x-auto rounded-lg border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Carta</TableHead>
                <TableHead>Stato</TableHead>
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
                  <TableCell className="text-right">{eur(totalCost(i))}</TableCell>
                  <TableCell className="text-right">{eur(currentValue(i))}</TableCell>
                  <TableCell className="text-right">{pct(roi(i))}</TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-1">
                      <CardFormDialog
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
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {rows.map((i) => (
            <Card key={i.id}>
              <CardContent className="space-y-2 pt-6">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{itemTitle(i)}</p>
                    <p className="truncate text-xs text-muted-foreground">{itemSubtitle(i)}</p>
                  </div>
                  <Badge variant="secondary">{i.status}</Badge>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Costo</span>
                  <span>{eur(totalCost(i))}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Valore</span>
                  <span>{eur(currentValue(i))}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">ROI</span>
                  <span>{pct(roi(i))}</span>
                </div>
                <div className="flex justify-end gap-1 pt-2">
                  <CardFormDialog
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
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </AppShell>
  );
}
