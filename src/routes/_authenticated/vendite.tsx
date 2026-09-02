import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { itemsQuery, salesQuery } from "@/lib/queries";
import { sellItem } from "@/lib/mutations";
import { dateIt, eur, itemTitle } from "@/lib/calc";

export const Route = createFileRoute("/_authenticated/vendite")({
  head: () => ({
    meta: [
      { title: "Vendite — Pokémon Collection Manager" },
      { name: "description", content: "Vendite registrate con ricavo netto, fee e profitto." },
      { property: "og:title", content: "Vendite — Pokémon Collection Manager" },
      { property: "og:description", content: "Registra vendite e monitora il profitto realizzato." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: VenditePage,
});

function SellDialog() {
  const { data: items } = useSuspenseQuery(itemsQuery());
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const available = items.filter((i) => i.status !== "SOLD");
  const [itemId, setItemId] = useState("");
  const [form, setForm] = useState({
    sale_date: new Date().toISOString().slice(0, 10),
    platform: "",
    buyer: "",
    gross_revenue: "",
    shipping: "",
    fees: "",
    taxes: "",
    notes: "",
  });

  const mutation = useMutation({
    mutationFn: () =>
      sellItem({
        itemId,
        sale_date: form.sale_date,
        platform: form.platform,
        buyer: form.buyer,
        gross_revenue: Number(form.gross_revenue || 0),
        shipping: Number(form.shipping || 0),
        fees: Number(form.fees || 0),
        taxes: Number(form.taxes || 0),
        notes: form.notes,
      }),
    onSuccess: () => {
      qc.invalidateQueries();
      toast.success("Vendita registrata");
      setOpen(false);
      setItemId("");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">Vendi</Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Registra vendita</DialogTitle>
          <DialogDescription>L'elemento passerà allo stato SOLD.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2">
            <Label>Elemento *</Label>
            <select
              className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={itemId}
              onChange={(e) => setItemId(e.target.value)}
            >
              <option value="">Seleziona…</option>
              {available.map((i) => (
                <option key={i.id} value={i.id}>
                  {itemTitle(i)}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label>Data</Label>
            <Input
              type="date"
              value={form.sale_date}
              onChange={(e) => setForm({ ...form, sale_date: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Piattaforma</Label>
            <Input
              value={form.platform}
              onChange={(e) => setForm({ ...form, platform: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Acquirente</Label>
            <Input value={form.buyer} onChange={(e) => setForm({ ...form, buyer: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label>Ricavo lordo (€)</Label>
            <Input
              type="number"
              step="0.01"
              value={form.gross_revenue}
              onChange={(e) => setForm({ ...form, gross_revenue: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Spedizione (€)</Label>
            <Input
              type="number"
              step="0.01"
              value={form.shipping}
              onChange={(e) => setForm({ ...form, shipping: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Fees (€)</Label>
            <Input
              type="number"
              step="0.01"
              value={form.fees}
              onChange={(e) => setForm({ ...form, fees: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Tasse (€)</Label>
            <Input
              type="number"
              step="0.01"
              value={form.taxes}
              onChange={(e) => setForm({ ...form, taxes: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Note</Label>
            <Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </div>
        </div>
        <DialogFooter>
          <Button disabled={!itemId || mutation.isPending} onClick={() => mutation.mutate()}>
            {mutation.isPending ? "Salvataggio…" : "Registra vendita"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function VenditePage() {
  const { data: sales } = useSuspenseQuery(salesQuery());
  const total = sales.reduce((s, v) => s + Number(v.net_revenue || 0), 0);

  return (
    <AppShell
      title="Vendite"
      subtitle={`${sales.length} vendite · ${eur(total)} netti`}
      actions={<SellDialog />}
    >
      {sales.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nessuna vendita registrata.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Piattaforma</TableHead>
                <TableHead>Acquirente</TableHead>
                <TableHead className="text-right">Lordo</TableHead>
                <TableHead className="text-right">Spedizione</TableHead>
                <TableHead className="text-right">Fees</TableHead>
                <TableHead className="text-right">Tasse</TableHead>
                <TableHead className="text-right">Netto</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sales.map((s) => (
                <TableRow key={s.id}>
                  <TableCell>{dateIt(s.sale_date)}</TableCell>
                  <TableCell>{s.platform ?? "—"}</TableCell>
                  <TableCell>{s.buyer ?? "—"}</TableCell>
                  <TableCell className="text-right">{eur(s.gross_revenue)}</TableCell>
                  <TableCell className="text-right">{eur(s.shipping)}</TableCell>
                  <TableCell className="text-right">{eur(s.fees)}</TableCell>
                  <TableCell className="text-right">{eur(s.taxes)}</TableCell>
                  <TableCell className="text-right font-medium">{eur(s.net_revenue)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </AppShell>
  );
}
