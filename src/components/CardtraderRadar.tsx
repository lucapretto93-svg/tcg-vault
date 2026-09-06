import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { BellRing, Radar, RefreshCw, SlidersHorizontal } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DealCard } from "@/components/DealCard";
import {
  activeDeals,
  cardtraderDealsQuery,
  cardtraderSettingsQuery,
  newDealsCount,
  setDealStatus,
  sortDeals,
  type CardtraderDeal,
} from "@/lib/cardtrader";
import { ownedBySetMap, setUrgency } from "@/lib/dealSort";
import { runCardtraderScan } from "@/lib/cardtrader.functions";
import { itemsQuery } from "@/lib/queries";

type DealSort = "score" | "set";

export function CardtraderRadar({ limit = 5 }: { limit?: number }) {
  const queryClient = useQueryClient();
  const [sort, setSort] = useState<DealSort>("score");
  const { data: settings } = useQuery(cardtraderSettingsQuery());
  const { data: deals = [] } = useQuery(cardtraderDealsQuery());
  const { data: items = [] } = useQuery(itemsQuery());
  const scan = useServerFn(runCardtraderScan);

  const ownedBySet = useMemo(() => ownedBySetMap(items), [items]);

  const visible = useMemo(() => {
    const sorted = sortDeals(activeDeals(deals));
    if (sort === "score") return sorted;
    return [...sorted].sort((a, b) => {
      const diff = setUrgency(ownedBySet, b) - setUrgency(ownedBySet, a);
      if (diff !== 0) return diff;
      return b.deal_score - a.deal_score;
    });
  }, [deals, sort, ownedBySet]);
  const shown = visible.slice(0, limit);
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
            <Radar className="h-5 w-5 text-amber-400" /> Top {limit} occasioni
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
              className={`min-h-9 rounded px-2 py-1 ${sort === "score" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
            >
              Miglior affare
            </button>
            <button
              type="button"
              onClick={() => setSort("set")}
              className={`min-h-9 rounded px-2 py-1 ${sort === "set" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
            >
              Chiudi i set
            </button>
          </div>
          <Button size="sm" variant="outline" className="min-h-11" disabled={runScan.isPending} onClick={() => runScan.mutate()}>
            <RefreshCw className={`mr-1 h-4 w-4 ${runScan.isPending ? "animate-spin" : ""}`} /> Scansiona
          </Button>
          <Button asChild size="sm" className="min-h-11">
            <Link to="/occasioni">
              <SlidersHorizontal className="mr-1 h-4 w-4" /> Tutte le occasioni
            </Link>
          </Button>
          <Button asChild size="sm" variant="ghost" className="min-h-11">
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
                ownedInSet={setUrgency(ownedBySet, deal)}
                onStatus={(next) => status.mutate({ id: deal.id, status: next })}
              />
            ))}
          </div>
        )}
        {visible.length > limit ? (
          <Button asChild variant="ghost" size="sm" className="min-h-11">
            <Link to="/occasioni">Vedi tutte le occasioni ({visible.length})</Link>
          </Button>
        ) : null}
      </CardContent>
    </Card>
  );
}
