import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { AppShell } from "@/components/AppShell";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { MoveList } from "@/components/MoveList";
import { buildMoves, filterMoves, type MoveKind } from "@/lib/actions";
import { itemsQuery } from "@/lib/queries";
import { eur } from "@/lib/calc";

export const Route = createFileRoute("/_authenticated/da-muovere")({
  head: () => ({
    meta: [
      { title: "Carte da muovere — TCG Vault" },
      {
        name: "description",
        content:
          "Le carte da mandare a gradare o da vendere subito, ordinate per guadagno atteso reale.",
      },
      { property: "og:title", content: "Carte da muovere — TCG Vault" },
      {
        property: "og:description",
        content: "Priorità di grading e vendita calcolate sui tuoi prezzi e costi reali.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: MovesPage,
});

const FILTERS: { key: MoveKind | "ALL"; label: string }[] = [
  { key: "ALL", label: "Tutte" },
  { key: "GRADE", label: "Da gradare" },
  { key: "SELL", label: "Da vendere" },
];

function MovesPage() {
  const { data: items } = useSuspenseQuery(itemsQuery());
  const [kind, setKind] = useState<MoveKind | "ALL">("ALL");
  const [search, setSearch] = useState("");

  const all = useMemo(() => buildMoves(items), [items]);
  const rows = useMemo(() => filterMoves(all, kind, search), [all, kind, search]);
  const potential = rows.reduce((sum, r) => sum + Math.max(r.gain, 0), 0);

  return (
    <AppShell
      title="Da muovere"
      subtitle="Grading e vendite con la priorità più alta"
      actions={<Badge variant="secondary">{rows.length}</Badge>}
    >
      <div className="sticky top-[57px] z-10 -mx-4 mb-4 space-y-2 border-b border-border bg-background/95 px-4 py-3 backdrop-blur md:top-[65px] md:-mx-6 md:px-6">
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Cerca carta, set o prodotto"
          className="min-h-11 text-base"
          inputMode="search"
        />
        <div className="-mx-1 flex items-center gap-2 overflow-x-auto px-1 pb-1 [-webkit-overflow-scrolling:touch]">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              type="button"
              onClick={() => setKind(f.key)}
              className={`min-h-9 shrink-0 rounded-full border px-3 py-1 text-xs font-medium ${
                kind === f.key
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border text-muted-foreground"
              }`}
            >
              {f.label}
            </button>
          ))}
          <span className="shrink-0 text-xs text-muted-foreground">
            Guadagno potenziale {eur(potential)}
          </span>
        </div>
      </div>

      <MoveList rows={rows} />
      <div className="h-[env(safe-area-inset-bottom)]" />
    </AppShell>
  );
}
