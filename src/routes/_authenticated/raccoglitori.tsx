import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { BookOpen, Plus, Search, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { ItemThumb } from "@/components/ItemThumb";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { bindersQuery, itemsQuery } from "@/lib/queries";
import {
  createBinder,
  deleteBinder,
  placeItemInBinder,
  removeItemFromBinder,
} from "@/lib/mutations";
import { itemTitle } from "@/lib/calc";
import { BINDER_COLORS, type ItemRow } from "@/lib/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/raccoglitori")({
  head: () => ({
    meta: [
      { title: "Raccoglitori — TCG Vault" },
      {
        name: "description",
        content:
          "Archivia le carte nei raccoglitori: pagina, tasca e posizione esatta di ogni carta.",
      },
      { property: "og:title", content: "Raccoglitori — TCG Vault" },
      {
        property: "og:description",
        content: "Vista raccoglitore con pagine e tasche per ritrovare subito ogni carta.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: BindersPage,
});

function BindersPage() {
  const queryClient = useQueryClient();
  const { data: binders } = useSuspenseQuery(bindersQuery());
  const { data: items } = useSuspenseQuery(itemsQuery());

  const [activeId, setActiveId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [color, setColor] = useState<string>("rosso");
  const [pages, setPages] = useState(20);
  const [slotsPerPage, setSlotsPerPage] = useState(9);
  const [picker, setPicker] = useState<{ page: number; slot: number } | null>(null);
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);

  const active = binders.find((b) => b.id === activeId) ?? binders[0] ?? null;

  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ["items"] });
    await queryClient.invalidateQueries({ queryKey: ["binders"] });
  };

  const placed = useMemo(() => {
    const map = new Map<string, ItemRow>();
    if (!active) return map;
    for (const item of items) {
      if (item.binder_id !== active.id) continue;
      if (item.binder_page == null || item.binder_slot == null) continue;
      map.set(`${item.binder_page}-${item.binder_slot}`, item);
    }
    return map;
  }, [items, active]);

  const unplaced = useMemo(() => {
    const term = q.trim().toLowerCase();
    return items
      .filter((i) => i.status !== "SOLD" && !i.binder_id)
      .filter((i) => (term ? itemTitle(i).toLowerCase().includes(term) : true))
      .slice(0, 40);
  }, [items, q]);

  const handleCreate = async () => {
    if (!name.trim()) return;
    setBusy(true);
    try {
      await createBinder({ name: name.trim(), color, pages, slots_per_page: slotsPerPage });
      setName("");
      setCreating(false);
      await refresh();
      toast.success("Raccoglitore creato");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Errore");
    } finally {
      setBusy(false);
    }
  };

  const handlePlace = async (item: ItemRow) => {
    if (!active || !picker) return;
    setBusy(true);
    try {
      await placeItemInBinder({
        itemId: item.id,
        binderId: active.id,
        page: picker.page,
        slot: picker.slot,
      });
      setPicker(null);
      await refresh();
      toast.success("Carta archiviata");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Errore");
    } finally {
      setBusy(false);
    }
  };

  const handleRemove = async (item: ItemRow) => {
    setBusy(true);
    try {
      await removeItemFromBinder(item.id);
      await refresh();
      toast.success("Tasca liberata");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Errore");
    } finally {
      setBusy(false);
    }
  };

  const handleDeleteBinder = async (id: string) => {
    setBusy(true);
    try {
      await deleteBinder(id);
      setActiveId(null);
      await refresh();
      toast.success("Raccoglitore eliminato");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Errore");
    } finally {
      setBusy(false);
    }
  };

  const slots = active ? Array.from({ length: active.slots_per_page }, (_, i) => i + 1) : [];
  const currentPage = active ? Math.min(page, active.pages) : 1;
  const filledInBinder = active ? items.filter((i) => i.binder_id === active.id).length : 0;

  return (
    <AppShell
      title="Raccoglitori"
      subtitle={`${binders.length} raccoglitori · archiviazione fisica`}
    >
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          {binders.map((binder) => (
            <Button
              key={binder.id}
              size="sm"
              variant={active?.id === binder.id ? "default" : "outline"}
              className="min-h-11"
              onClick={() => {
                setActiveId(binder.id);
                setPage(1);
              }}
            >
              <BookOpen className="mr-1.5 h-4 w-4" />
              {binder.name}
            </Button>
          ))}
          <Button size="sm" variant="secondary" className="min-h-11" onClick={() => setCreating(true)}>
            <Plus className="mr-1.5 h-4 w-4" />
            Nuovo
          </Button>
        </div>

        {!active ? (
          <Card>
            <CardContent className="p-6 text-sm text-muted-foreground">
              Nessun raccoglitore. Creane uno per registrare dove sono fisicamente le carte.
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
              <CardTitle className="text-base">
                {active.name}{" "}
                <Badge variant="outline" className="ml-2 align-middle">
                  {filledInBinder} carte
                </Badge>
              </CardTitle>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="min-h-11"
                  disabled={currentPage <= 1}
                  onClick={() => setPage(currentPage - 1)}
                >
                  ←
                </Button>
                <span className="text-sm text-muted-foreground">
                  Pagina {currentPage}/{active.pages}
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  className="min-h-11"
                  disabled={currentPage >= active.pages}
                  onClick={() => setPage(currentPage + 1)}
                >
                  →
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="min-h-11 text-destructive"
                  disabled={busy}
                  onClick={() => handleDeleteBinder(active.id)}
                  aria-label="Elimina raccoglitore"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div
                className={cn(
                  "grid gap-2",
                  active.slots_per_page === 4 ? "grid-cols-2" : "grid-cols-3",
                )}
              >
                {slots.map((slot) => {
                  const item = placed.get(`${currentPage}-${slot}`);
                  return (
                    <div
                      key={slot}
                      className="relative flex aspect-[3/4] min-w-0 flex-col items-center justify-center overflow-hidden rounded-lg border border-border/70 bg-muted/20 p-1"
                    >
                      {item ? (
                        <>
                          <ItemThumb item={item} className="h-full w-full rounded-md" />
                          <button
                            type="button"
                            aria-label="Togli dalla tasca"
                            className="absolute right-1 top-1 rounded-full bg-background/80 p-1"
                            onClick={() => handleRemove(item)}
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                          <span className="pointer-events-none absolute inset-x-0 bottom-0 truncate bg-background/80 px-1 py-0.5 text-[10px]">
                            {itemTitle(item)}
                          </span>
                        </>
                      ) : (
                        <button
                          type="button"
                          className="flex h-full w-full min-h-11 items-center justify-center text-xs text-muted-foreground"
                          onClick={() => setPicker({ page: currentPage, slot })}
                        >
                          <Plus className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <Dialog open={creating} onOpenChange={setCreating}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Nuovo raccoglitore</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label htmlFor="binder-name">Nome</Label>
              <Input
                id="binder-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Es. Vintage IT"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="binder-pages">Pagine</Label>
                <Input
                  id="binder-pages"
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={200}
                  value={pages}
                  onChange={(e) => setPages(Number(e.target.value) || 1)}
                />
              </div>
              <div>
                <Label htmlFor="binder-slots">Tasche/pagina</Label>
                <select
                  id="binder-slots"
                  className="h-10 w-full rounded-md border border-input bg-background px-2 text-sm"
                  value={slotsPerPage}
                  onChange={(e) => setSlotsPerPage(Number(e.target.value))}
                >
                  <option value={4}>4</option>
                  <option value={9}>9</option>
                  <option value={12}>12</option>
                </select>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {BINDER_COLORS.map((c) => (
                <Button
                  key={c}
                  size="sm"
                  type="button"
                  variant={color === c ? "default" : "outline"}
                  onClick={() => setColor(c)}
                >
                  {c}
                </Button>
              ))}
            </div>
            <Button className="w-full" disabled={busy || !name.trim()} onClick={handleCreate}>
              Crea raccoglitore
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={picker != null} onOpenChange={(open) => !open && setPicker(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              Scegli la carta — pagina {picker?.page}, tasca {picker?.slot}
            </DialogTitle>
          </DialogHeader>
          <div className="relative">
            <Search className="absolute left-2 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Cerca carta o prodotto"
              className="pl-8"
            />
          </div>
          <div className="max-h-[50vh] space-y-1 overflow-y-auto">
            {unplaced.length === 0 ? (
              <p className="p-3 text-sm text-muted-foreground">Nessun oggetto libero trovato.</p>
            ) : (
              unplaced.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  disabled={busy}
                  onClick={() => handlePlace(item)}
                  className="flex w-full min-h-11 items-center gap-2 rounded-md border border-border/60 p-2 text-left text-sm hover:bg-muted/40"
                >
                  <ItemThumb item={item} className="h-10 w-8 shrink-0 rounded" />
                  <span className="min-w-0 truncate">{itemTitle(item)}</span>
                </button>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
