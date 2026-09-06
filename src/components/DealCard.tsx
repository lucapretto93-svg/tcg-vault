import { ExternalLink, EyeOff, ShoppingCart, Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { eur } from "@/lib/calc";
import type { CardtraderDeal } from "@/lib/cardtrader";

export function scoreTone(score: number): string {
  if (score >= 90) return "bg-amber-500/15 text-amber-400 border-amber-500/40";
  if (score >= 70) return "bg-emerald-500/15 text-emerald-400 border-emerald-500/40";
  return "bg-muted text-muted-foreground";
}

export function DealCard({
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
        <Button asChild size="sm" className="min-h-11 flex-1 min-w-[9rem]">
          <a href={deal.url ?? "https://www.cardtrader.com"} target="_blank" rel="noreferrer">
            <ExternalLink className="mr-1 h-4 w-4" /> Apri su CardTrader
          </a>
        </Button>
        <Button size="sm" variant="secondary" className="min-h-11" onClick={() => onStatus("PURCHASED")}>
          <ShoppingCart className="mr-1 h-4 w-4" /> Acquistata
        </Button>
        <Button size="sm" variant="outline" className="min-h-11" onClick={() => onStatus("SAVED")}>
          <Star className="mr-1 h-4 w-4" /> Salva
        </Button>
        <Button size="sm" variant="ghost" className="min-h-11" onClick={() => onStatus("IGNORED")}>
          <EyeOff className="mr-1 h-4 w-4" /> Ignora
        </Button>
      </div>
    </article>
  );
}
