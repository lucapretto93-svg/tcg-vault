import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DealCard } from "@/components/DealCard";
import {
  CT_CONDITIONS,
  CT_LANGUAGES,
  activeDeals,
  cardtraderDealsQuery,
  setDealStatus,
  sortDeals,
  type CardtraderDeal,
} from "@/lib/cardtrader";
import { ownedBySetMap, setUrgency } from "@/lib/dealSort";
import { itemsQuery } from "@/lib/queries";

export const Route = createFileRoute("/_authenticated/occasioni")({
  head: () => ({
    meta: [
      { title: "Occasioni CardTrader — TCG Vault" },
      {
        name: "description",
        content:
          "Tutte le occasioni trovate dal radar CardTrader, con filtri per sconto, prezzo, lingua e condizione.",
      },
      { property: "og:title", content: "Occasioni CardTrader — TCG Vault" },
      {
        property: "og:description",
        content: "Filtra le migliori occasioni per sconto, prezzo, lingua e condizione.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: DealsPage,
});

type SortKey = "score" | "discount" | "margin" | "price" | "set";

const SORTS: { key: SortKey; label: string }[] = [
  { key: "score", label: "Miglior affare" },
  { key: "discount", label: "Sconto" },
  { key: "margin", label: "Margine" },
  { key: "price", label: "Prezzo" },
  { key: "set", label: "Chiudi i set" },
];

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`min-h-9 shrink-0 rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
        active
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border text-muted-foreground"
      }`}
    >
      {children}
    </button>
  );
}

function DealsPage() {
  const queryClient = useQueryClient();
  const { data: deals = [] } = useQuery(cardtraderDealsQuery());
  const { data: items = [] } = useQuery(itemsQuery());

  const [search, setSearch] = useState("");
  const [minDiscount, setMinDiscount] = useState(0);
  const [maxPrice, setMaxPrice] = useState("");
  const [conditions, setConditions] = useState<string[]>([]);
  const [languages, setLanguages] = useState<string[]>([]);
  const [zeroOnly, setZeroOnly] = useState(false);
  const [savedOnly, setSavedOnly] = useState(false);
  const [sort, setSort] = useState<SortKey>("score");

  const ownedBySet = useMemo(() => ownedBySetMap(items), [items]);

  const toggle = (list: string[], value: string, set: (v: string[]) => void) =>
    set(list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    const max = Number(maxPrice);
    let list = activeDeals(deals).filter((d) => {
      if (q && ![d.card_name, d.set_name, d.card_number].join(" ").toLowerCase().includes(q))
        return false;
      if (minDiscount > 0 && (d.discount_pct ?? 0) < minDiscount) return false;
      if (maxPrice && Number.isFinite(max) && d.price > max) return false;
      if (conditions.length && (!d.condition || !conditions.includes(d.condition))) return false;
      if (languages.length && (!d.language || !languages.includes(d.language))) return false;
      if (zeroOnly && !d.zero_eligible) return false;
      if (savedOnly && d.status !== "SAVED") return false;
      return true;
    });
    list = sortDeals(list);
    if (sort === "discount")
      list = [...list].sort((a, b) => (b.discount_pct ?? 0) - (a.discount_pct ?? 0));
    if (sort === "margin") list = [...list].sort((a, b) => (b.margin ?? 0) - (a.margin ?? 0));
    if (sort === "price") list = [...list].sort((a, b) => a.price - b.price);
    if (sort === "set")
      list = [...list].sort((a, b) => {
        const diff = setUrgency(ownedBySet, b) - setUrgency(ownedBySet, a);
        return diff !== 0 ? diff : b.deal_score - a.deal_score;
      });
    return list;
  }, [deals, search, minDiscount, maxPrice, conditions, languages, zeroOnly, savedOnly, sort, ownedBySet]);

  const status = useMutation({
    mutationFn: ({ id, status }: { id: string; status: CardtraderDeal["status"] }) =>
      setDealStatus(id, status),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["cardtrader_deals"] }),
    onError: (error: Error) => toast.error(error.message),
  });

  return (
    <AppShell
      title="Occasioni"
      subtitle="Tutte le offerte trovate dal radar CardTrader"
      actions={<Badge variant="secondary">{rows.length}</Badge>}
    >
      <div className="sticky top-[57px] z-10 -mx-4 mb-4 space-y-2 border-b border-border bg-background/95 px-4 py-3 backdrop-blur md:top-[65px] md:-mx-6 md:px-6">
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Cerca carta o set"
          className="min-h-11 text-base"
          inputMode="search"
        />
        <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 [-webkit-overflow-scrolling:touch]">
          {SORTS.map((s) => (
            <Chip key={s.key} active={sort === s.key} onClick={() => setSort(s.key)}>
              {s.label}
            </Chip>
          ))}
        </div>
        <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 [-webkit-overflow-scrolling:touch]">
          {[0, 30, 40, 50, 60].map((v) => (
            <Chip key={v} active={minDiscount === v} onClick={() => setMinDiscount(v)}>
              {v === 0 ? "Sconto: tutti" : `≥ ${v}%`}
            </Chip>
          ))}
          <Chip active={zeroOnly} onClick={() => setZeroOnly((v) => !v)}>
            CT Zero
          </Chip>
          <Chip active={savedOnly} onClick={() => setSavedOnly((v) => !v)}>
            Watchlist
          </Chip>
          <input
            value={maxPrice}
            onChange={(e) => setMaxPrice(e.target.value.replace(/[^0-9.]/g, ""))}
            placeholder="Prezzo max €"
            inputMode="decimal"
            className="min-h-9 w-32 shrink-0 rounded-full border border-border bg-transparent px-3 text-xs"
          />
        </div>
        <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 [-webkit-overflow-scrolling:touch]">
          {CT_CONDITIONS.map((c) => (
            <Chip
              key={c}
              active={conditions.includes(c)}
              onClick={() => toggle(conditions, c, setConditions)}
            >
              {c}
            </Chip>
          ))}
          {CT_LANGUAGES.map((l) => (
            <Chip
              key={l}
              active={languages.includes(l)}
              onClick={() => toggle(languages, l, setLanguages)}
            >
              {l.toUpperCase()}
            </Chip>
          ))}
        </div>
      </div>

      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Nessuna occasione con questi filtri. Prova ad allargare sconto o prezzo, oppure avvia una
          nuova scansione dalla dashboard.
        </p>
      ) : (
        <div className="grid gap-3 lg:grid-cols-2 2xl:grid-cols-3">
          {rows.map((deal) => (
            <DealCard
              key={deal.id}
              deal={deal}
              ownedInSet={setUrgency(ownedBySet, deal)}
              onStatus={(next) => status.mutate({ id: deal.id, status: next })}
            />
          ))}
        </div>
      )}
      <div className="h-[env(safe-area-inset-bottom)]" />
    </AppShell>
  );
}
