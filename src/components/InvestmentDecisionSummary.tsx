import { Badge } from "@/components/ui/badge";
import { currentValue, eur, roi, totalCost } from "@/lib/calc";
import { DECISION_LABELS, type ItemRow } from "@/lib/types";

export function InvestmentDecisionSummary({ item }: { item: ItemRow }) {
  const decision = [...item.investment_decisions].sort(
    (a, b) => +new Date(b.updated_at) - +new Date(a.updated_at),
  )[0];
  const cost = totalCost(item);
  const value = currentValue(item);
  const profit = value - cost;
  const currentRoi = roi(item);

  return (
    <section className="rounded-lg border border-border p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-semibold">Strategia investimento</h3>
        {decision ? <Badge>{DECISION_LABELS[decision.decision]}</Badge> : <Badge variant="outline">DA VALUTARE</Badge>}
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <div><p className="text-xs text-muted-foreground">Prezzo acquisto</p><p className="font-semibold">{cost > 0 ? eur(cost) : "Da inserire"}</p></div>
        <div><p className="text-xs text-muted-foreground">Valore attuale</p><p className="font-semibold">{value > 0 ? eur(value) : "Da aggiornare"}</p></div>
        <div><p className="text-xs text-muted-foreground">Profit / Loss</p><p className="font-semibold">{cost > 0 && value > 0 ? eur(profit) : "—"}</p></div>
        <div><p className="text-xs text-muted-foreground">ROI</p><p className="font-semibold">{currentRoi == null ? "—" : `${currentRoi >= 0 ? "+" : ""}${currentRoi.toFixed(1)}%`}</p></div>
        <div><p className="text-xs text-muted-foreground">Target vendita</p><p className="font-semibold">{decision?.buy_it_now_price ? eur(decision.buy_it_now_price) : "—"}</p></div>
      </div>
      {decision?.min_acceptable_price ? <p className="mt-3 text-sm"><span className="text-muted-foreground">Minimo accettabile:</span> {eur(decision.min_acceptable_price)}</p> : null}
      <div className="mt-3 rounded-md bg-muted/50 p-3">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Motivazione</p>
        <p className="mt-1 text-sm">{decision?.rationale || "Manca ancora una decisione motivata. Inserire valore di mercato e costo d'acquisto prima di decidere se tenere, vendere, attendere o fare upgrade."}</p>
      </div>
    </section>
  );
}
