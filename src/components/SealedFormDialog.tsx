import { useState, type ReactNode } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createItemWithPurchase, updateSealed } from "@/lib/mutations";
import { LANGUAGES, PRODUCT_TYPES, type ItemRow } from "@/lib/types";

type Form = {
  name: string;
  set_name: string;
  language: string;
  year: string;
  product_type: string;
  quantity: string;
  package_condition: string;
  sealed_status: string;
  notes: string;
  sealedValue: string;
  purchasePrice: string;
};

function emptyForm(): Form {
  return {
    name: "",
    set_name: "",
    language: "IT",
    year: "",
    product_type: "ETB",
    quantity: "1",
    package_condition: "",
    sealed_status: "Sigillato",
    notes: "",
    sealedValue: "",
    purchasePrice: "",
  };
}

function fromItem(item: ItemRow): Form {
  const s = item.sealed_products[0];
  return {
    ...emptyForm(),
    name: s?.name ?? "",
    set_name: s?.set_name ?? "",
    language: s?.language ?? "IT",
    year: s?.year ? String(s.year) : "",
    product_type: s?.product_type ?? "ETB",
    quantity: String(s?.quantity ?? 1),
    package_condition: s?.package_condition ?? "",
    sealed_status: s?.sealed_status ?? "Sigillato",
    notes: item.notes ?? "",
  };
}

export function SealedFormDialog({ item, trigger }: { item?: ItemRow; trigger: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Form>(() => (item ? fromItem(item) : emptyForm()));
  const qc = useQueryClient();
  const set = <K extends keyof Form>(k: K, v: Form[K]) => setForm((f) => ({ ...f, [k]: v }));

  const mutation = useMutation({
    mutationFn: async () => {
      const sealed = {
        name: form.name.trim(),
        set_name: form.set_name || null,
        language: form.language || null,
        year: form.year ? Number(form.year) : null,
        product_type: form.product_type,
        quantity: Number(form.quantity || 1),
        package_condition: form.package_condition || null,
        sealed_status: form.sealed_status || null,
      };
      if (item) {
        await updateSealed(item.id, sealed, form.notes);
        return;
      }
      const price = Number(form.purchasePrice || 0);
      await createItemWithPurchase({
        item_type: "SEALED",
        sealed,
        notes: form.notes,
        rawValue: form.sealedValue ? Number(form.sealedValue) : undefined,
        purchase: price
          ? {
              purchase_date: new Date().toISOString().slice(0, 10),
              platform: "",
              seller: "",
              item_price: price,
              shipping: 0,
              fees: 0,
              taxes: 0,
              notes: "",
            }
          : undefined,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries();
      toast.success(item ? "Prodotto aggiornato" : "Prodotto aggiunto");
      setOpen(false);
      if (!item) setForm(emptyForm());
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{item ? "Modifica prodotto" : "Nuovo prodotto sealed"}</DialogTitle>
          <DialogDescription>Dati del prodotto sigillato.</DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2">
            <Label>Nome *</Label>
            <Input value={form.name} onChange={(e) => set("name", e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Set</Label>
            <Input value={form.set_name} onChange={(e) => set("set_name", e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Tipo prodotto</Label>
            <select
              className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={form.product_type}
              onChange={(e) => set("product_type", e.target.value)}
            >
              {PRODUCT_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label>Lingua</Label>
            <select
              className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={form.language}
              onChange={(e) => set("language", e.target.value)}
            >
              {LANGUAGES.map((l) => (
                <option key={l} value={l}>
                  {l}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label>Anno</Label>
            <Input type="number" value={form.year} onChange={(e) => set("year", e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Quantità</Label>
            <Input
              type="number"
              min="1"
              value={form.quantity}
              onChange={(e) => set("quantity", e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Condizione confezione</Label>
            <Input
              value={form.package_condition}
              onChange={(e) => set("package_condition", e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Stato sigillo</Label>
            <Input
              value={form.sealed_status}
              onChange={(e) => set("sealed_status", e.target.value)}
            />
          </div>
          {!item ? (
            <>
              <div className="space-y-1.5">
                <Label>Valore sealed (€)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={form.sealedValue}
                  onChange={(e) => set("sealedValue", e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Prezzo acquisto (€)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={form.purchasePrice}
                  onChange={(e) => set("purchasePrice", e.target.value)}
                />
              </div>
            </>
          ) : null}
        </div>

        <div className="mt-2 space-y-1.5">
          <Label>Note</Label>
          <Textarea value={form.notes} onChange={(e) => set("notes", e.target.value)} />
        </div>

        <DialogFooter>
          <Button disabled={!form.name.trim() || mutation.isPending} onClick={() => mutation.mutate()}>
            {mutation.isPending ? "Salvataggio…" : "Salva"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
