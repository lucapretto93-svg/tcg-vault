import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { BellRing, ExternalLink, EyeOff, Radar, RefreshCw, ShoppingCart, Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  activeDeals,
  cardtraderDealsQuery,
  cardtraderSettingsQuery,
  newDealsCount,
  setDealStatus,
  sortDeals,
  type CardtraderDeal,
} from "@/lib/cardtrader";
import { runCardtraderScan } from "@/lib/cardtrader.functions";
import { eur } from "@/lib/calc";
import { itemsQuery } from "@/lib/queries";

function norm(value: string | null | undefined): string {
  return (value ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]/g, "");
}

type DealSort = "score" | "set";

function scoreTone(score: number): string {
  if (score >= 90) return "bg-amber-500/15 text-amber-400 border-amber-500/40";
  if (score >= 70) return "bg-emerald-500/15 text-emerald-400 border-emerald-500/40";
  return "bg-muted text-muted-foreground";
}

function DealCard({
  deal,
  onStatus,
  ownedInSet,
}: {
  deal: CardtraderDeal;
  onStatus: (s: CardtraderDeal["status"]) => void;
  ownedInSet?: number;
}) {
  return (
    <article className="flex flex-col gap-3 rounded-xl border border-border bg-card/60 p-3">
      <div className="flex items-start gap-3">
        {deal.image_url ? (
          <img
            src={deal.image_url}
            alt={deal.card_name}
            loading="lazy"
            className="h-20 w-14 shrink-0 rounded-md object-cover"
          />
        ) : null}
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{deal.card_name || "Carta CardTrader"}</p>
          <p className="truncate text-xs text-muted-foreground">
            {[deal.set_name, deal.card_number ? `#${deal.card_number}` : null, deal.language?.toUpperCase()]
              .filter(Boolean)
              .join(" · ")}
          </p>
          <div className="mt-1 flex flex-wrap gap-1">
            {deal.condition ? <Badge variant="outline">{deal.condition}</Badge> : null}
            {deal.foil ? <Badge variant="outline">Reverse/Foil</Badge> : null}
            {deal.zero_eligible ? <Badge variant="outline">CT Zero</Badge> : null}
            {deal.status === "NEW" ? <Badge>Nuova</Badge> : null}
            {deal.status === "SAVED" ? <Badge variant="secondary">Watchlist</Badge> : null}
            {ownedInSet ? <Badge variant="secondary">Hai già {ownedInSet} del set</Badge> : null}
          </div>
        </div>
        <span className={`rounded-md border px-2 py-1 text-xs font-bold ${scoreTone(deal.deal_score)}`}>
          {deal.deal_score}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
        <div>
          <p className="text-muted-foreground">Prezzo</p>
          <p className="font-semibold">{eur(deal.price)}</p>
        </div>
        <div>
          <p className="text-muted-foreground">Benchmark</p>
          <p className="font-semibold">{deal.benchmark != null ? eur(deal.benchmark) : "—"}</p>
        </div>
        <div>
          <p className="text-muted-foreground">Sconto</p>
          <p className="font-semibold text-emerald-400">
            {deal.discount_pct != null ? `-${deal.discount_pct}%` : "—"}
          </p>
        </div>
        <div>
          <p className="text-muted-foreground">Margine / ROI</p>
          <p className="font-semibold">
            {deal.margin != null ? eur(deal.margin) : "—"}
            {deal.roi != null ? ` · ${deal.roi}%` : ""}
          </p>
        </div>
      </div>
      <p className="text-[11px] text-muted-foreground">
        {deal.benchmark_source ?? "Benchmark stessa condizione"} · visto{" "}
        {new Date(deal.last_seen_at).toLocaleString("it-IT")}
      </p>

      <div className="flex flex-wrap gap-2">
        <Button asChild size="sm" className="flex-1 min-w-[9rem]">
          <a href={deal.url ?? "https://www.cardtrader.com"} target="_blank" rel="noreferrer">
            <ExternalLink className="mr-1 h-4 w-4" /> Apri su CardTrader
          </a>
        </Button>
        <Button size="sm" variant="secondary" onClick={() => onStatus("PURCHASED")}>
          <ShoppingCart className="mr-1 h-4 w-4" /> Acquistata
        </Button>
        <Button size="sm" variant="outline" onClick={() => onStatus("SAVED")}>
          <Star className="mr-1 h-4 w-4" /> Salva
        </Button>
        <Button size="sm" variant="ghost" onClick={() => onStatus("IGNORED")}>
          <EyeOff className="mr-1 h-4 w-4" /> Ignora
        </Button>
      </div>
    </article>
  );
}

export function CardtraderRadar() {
  const queryClient = useQueryClient();
  const [expanded, setExpanded] = useState(false);
  const [sort, setSort] = useState<DealSort>("score");
  const { data: settings } = useQuery(cardtraderSettingsQuery());
  const { data: deals = [] } = useQuery(cardtraderDealsQuery());
  const { data: items = [] } = useQuery(itemsQuery());
  const scan = useServerFn(runCardtraderScan);

  // Quante carte possiedi già in ciascun set: più ne hai, più il set è vicino a chiudersi.
  const ownedBySet = useMemo(() => {
    const map = new Map<string, Set<string>>();
    for (const item of items) {
      const card = item.cards[0];
      if (!card) continue;
      const keys = [norm(card.set_name), norm(card.set_code)].filter(Boolean);
      for (const key of keys) {
        const nums = map.get(key) ?? new Set<string>();
        nums.add(norm(card.card_number) || card.id);
        map.set(key, nums);
      }
    }
    return new Map([...map].map(([k, v]) => [k, v.size]));
  }, [items]);

  const setUrgency = (deal: CardtraderDeal): number =>
    Math.max(ownedBySet.get(norm(deal.set_name)) ?? 0, ownedBySet.get(norm(deal.expansion_code)) ?? 0);

  const visible = useMemo(() => {
    const sorted = sortDeals(activeDeals(deals));
    if (sort === "score") return sorted;
    return [...sorted].sort((a, b) => {
      const diff = setUrgency(b) - setUrgency(a);
      if (diff !== 0) return diff;
      return b.deal_score - a.deal_score;
    });
  }, [deals, sort, ownedBySet]);
  const shown = expanded ? visible : visible.slice(0, 6);
  const newCount = newDealsCount(deals);

  const status = useMutation({
    mutationFn: ({ id, status }: { id: string; status: CardtraderDeal["status"] }) =>
      setDealStatus(id, status),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["cardtrader_deals"] }),
    onError: (error: Error) => toast.error(error.message),
  });

  const runScan = useMutation({
    mutationFn: () => scan({}),
    onSuccess: async (result) => {
      await queryClient.invalidateQueries({ queryKey: ["cardtrader_deals"] });
      await queryClient.invalidateQueries({ queryKey: ["cardtrader_settings"] });
      if (result.status === "not_configured") toast.warning("Configura CardTrader nelle Impostazioni.");
      else if (result.status === "disabled") toast.warning("Radar disattivato nelle Impostazioni.");
      else if (result.status === "error") toast.error(result.message);
      else toast.success(result.message);
    },
    onError: (error: Error) => toast.error(error.message),
  });

  return (
    <Card className="border-amber-500/30 bg-gradient-to-br from-amber-500/5 to-transparent">
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
        <div>
          <CardTitle className="flex items-center gap-2 text-base">
            <Radar className="h-5 w-5 text-amber-400" /> Radar Occasioni · Affari CardTrader
            {newCount > 0 ? <Badge className="ml-1">{newCount} nuove</Badge> : null}
          </CardTitle>
          <CardDescription>
            {settings?.last_scan_at
              ? `Ultima scansione ${new Date(settings.last_scan_at).toLocaleString("it-IT")} · ${settings.last_scan_status ?? ""}`
              : "Nessuna scansione ancora eseguita."}
          </CardDescription>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-md border border-border p-0.5 text-xs">
            <button
              type="button"
              onClick={() => setSort("score")}
              className={`rounded px-2 py-1 ${sort === "score" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
            >
              Miglior affare
            </button>
            <button
              type="button"
              onClick={() => setSort("set")}
              className={`rounded px-2 py-1 ${sort === "set" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
            >
              Chiudi i set
            </button>
          </div>
          <Button size="sm" variant="outline" disabled={runScan.isPending} onClick={() => runScan.mutate()}>
            <RefreshCw className={`mr-1 h-4 w-4 ${runScan.isPending ? "animate-spin" : ""}`} /> Scansiona
          </Button>
          <Button asChild size="sm" variant="ghost">
            <Link to="/impostazioni">
              <BellRing className="mr-1 h-4 w-4" /> Impostazioni
            </Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {!settings?.radar_enabled ? (
          <p className="rounded-lg border border-dashed border-border p-3 text-sm text-muted-foreground">
            Radar non attivo. Vai in <Link to="/impostazioni" className="underline">Impostazioni → CardTrader</Link>{" "}
            per configurare la connessione e le soglie.
          </p>
        ) : null}
        {visible.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nessuna occasione sopra la soglia al momento. Il radar continua a controllare ogni ora.
          </p>
        ) : (
          <div className="grid gap-3 lg:grid-cols-2">
            {shown.map((deal) => (
              <DealCard
                key={deal.id}
                deal={deal}
                ownedInSet={setUrgency(deal)}
                onStatus={(next) => status.mutate({ id: deal.id, status: next })}
              />
            ))}
          </div>
        )}
        {visible.length > 6 ? (
          <Button variant="ghost" size="sm" onClick={() => setExpanded((v) => !v)}>
            {expanded ? "Mostra meno" : `Mostra tutte (${visible.length})`}
          </Button>
        ) : null}
      </CardContent>
    </Card>
  );
}
