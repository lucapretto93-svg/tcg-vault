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
import { Checkbox } from "@/components/ui/checkbox";
import { createItemWithPurchase, updateCard } from "@/lib/mutations";
import { LANGUAGES, type ItemRow } from "@/lib/types";

type Form = {
  pokemon_name: string;
  card_name: string;
  set_name: string;
  set_code: string;
  card_number: string;
  set_total: string;
  year: string;
  language: string;
  rarity: string;
  variant: string;
  holo: boolean;
  reverse_holo: boolean;
  first_edition: boolean;
  unlimited: boolean;
  shadowless: boolean;
  promo: boolean;
  notes: string;
  rawValue: string;
  purchasePrice: string;
};

function emptyForm(): Form {
  return {
    pokemon_name: "",
    card_name: "",
    set_name: "",
    set_code: "",
    card_number: "",
    set_total: "",
    year: "",
    language: "IT",
    rarity: "",
    variant: "",
    holo: false,
    reverse_holo: false,
    first_edition: false,
    unlimited: false,
    shadowless: false,
    promo: false,
    notes: "",
    rawValue: "",
    purchasePrice: "",
  };
}

function fromItem(item: ItemRow): Form {
  const c = item.cards[0];
  return {
    ...emptyForm(),
    pokemon_name: c?.pokemon_name ?? "",
    card_name: c?.card_name ?? "",
    set_name: c?.set_name ?? "",
    set_code: c?.set_code ?? "",
    card_number: c?.card_number ?? "",
    set_total: c?.set_total ?? "",
    year: c?.year ? String(c.year) : "",
    language: c?.language ?? "IT",
    rarity: c?.rarity ?? "",
    variant: c?.variant ?? "",
    holo: !!c?.holo,
    reverse_holo: !!c?.reverse_holo,
    first_edition: !!c?.first_edition,
    unlimited: !!c?.unlimited,
    shadowless: !!c?.shadowless,
    promo: !!c?.promo,
    notes: item.notes ?? "",
  };
}

const FLAGS: [keyof Form, string][] = [
  ["holo", "Holo"],
  ["reverse_holo", "Reverse holo"],
  ["first_edition", "1st Edition"],
  ["unlimited", "Unlimited"],
  ["shadowless", "Shadowless"],
  ["promo", "Promo"],
];

export function CardFormDialog({ item, trigger }: { item?: ItemRow; trigger: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Form>(() => (item ? fromItem(item) : emptyForm()));
  const qc = useQueryClient();

  const set = <K extends keyof Form>(k: K, v: Form[K]) => setForm((f) => ({ ...f, [k]: v }));

  const mutation = useMutation({
    mutationFn: async () => {
      const card = {
        pokemon_name: form.pokemon_name.trim(),
        card_name: form.card_name.trim() || form.pokemon_name.trim(),
        set_name: form.set_name || null,
        set_code: form.set_code || null,
        card_number: form.card_number || null,
        set_total: form.set_total || null,
        year: form.year ? Number(form.year) : null,
        language: form.language || null,
        rarity: form.rarity || null,
        variant: form.variant || null,
        holo: form.holo,
        reverse_holo: form.reverse_holo,
        first_edition: form.first_edition,
        unlimited: form.unlimited,
        shadowless: form.shadowless,
        promo: form.promo,
      };
      if (item) {
        await updateCard(item.id, card, form.notes);
        return;
      }
      const price = Number(form.purchasePrice || 0);
      await createItemWithPurchase({
        item_type: "CARD",
        card,
        notes: form.notes,
        rawValue: form.rawValue ? Number(form.rawValue) : undefined,
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
      toast.success(item ? "Carta aggiornata" : "Carta aggiunta");
      setOpen(false);
      if (!item) setForm(emptyForm());
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{item ? "Modifica carta" : "Nuova carta"}</DialogTitle>
          <DialogDescription>Dati identificativi della carta.</DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Pokémon *</Label>
            <Input
              value={form.pokemon_name}
              onChange={(e) => set("pokemon_name", e.target.value)}
              placeholder="Charizard"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Nome carta</Label>
            <Input value={form.card_name} onChange={(e) => set("card_name", e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Set</Label>
            <Input value={form.set_name} onChange={(e) => set("set_name", e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Codice set</Label>
            <Input value={form.set_code} onChange={(e) => set("set_code", e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Numero</Label>
            <Input value={form.card_number} onChange={(e) => set("card_number", e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Totale set</Label>
            <Input value={form.set_total} onChange={(e) => set("set_total", e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Anno</Label>
            <Input
              type="number"
              value={form.year}
              onChange={(e) => set("year", e.target.value)}
            />
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
            <Label>Rarità</Label>
            <Input value={form.rarity} onChange={(e) => set("rarity", e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Variante</Label>
            <Input value={form.variant} onChange={(e) => set("variant", e.target.value)} />
          </div>
          {!item ? (
            <>
              <div className="space-y-1.5">
                <Label>Valore raw (€)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={form.rawValue}
                  onChange={(e) => set("rawValue", e.target.value)}
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

        <div className="mt-2 flex flex-wrap gap-4">
          {FLAGS.map(([key, label]) => (
            <label key={String(key)} className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={form[key] as boolean}
                onCheckedChange={(v) => set(key, Boolean(v) as never)}
              />
              {label}
            </label>
          ))}
        </div>

        <div className="mt-2 space-y-1.5">
          <Label>Note</Label>
          <Textarea value={form.notes} onChange={(e) => set("notes", e.target.value)} />
        </div>

        <DialogFooter>
          <Button
            disabled={!form.pokemon_name.trim() || mutation.isPending}
            onClick={() => mutation.mutate()}
          >
            {mutation.isPending ? "Salvataggio…" : "Salva"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
