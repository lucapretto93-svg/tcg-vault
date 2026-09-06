import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { InvestmentDecisionDialog } from "@/components/InvestmentDecisionDialog";
import { currentValue, eur, roi, totalCost } from "@/lib/calc";
import { DECISION_LABELS, getLatestDecision, type ItemRow } from "@/lib/types";

export function InvestmentDecisionSummary({ item }: { item: ItemRow }) {
  const decision = getLatestDecision(item);
  const cost = totalCost(item);
  const value = currentValue(item);
  const profit = value - cost;
  const currentRoi = roi(item);

  return (
    <section className="rounded-lg border border-border p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-semibold">Strategia investimento</h3>
        <div className="flex items-center gap-2">
          {decision ? (
            <Badge>{DECISION_LABELS[decision.decision]}</Badge>
          ) : (
            <Badge variant="outline">DA COMPLETARE</Badge>
          )}
          <InvestmentDecisionDialog
            item={item}
            trigger={
              <Button size="sm" variant="outline">
                {decision ? "Modifica" : "Imposta"}
              </Button>
            }
          />
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <div>
          <p className="text-xs text-muted-foreground">Costo acquisto</p>
          <p className="font-semibold">{cost > 0 ? eur(cost) : "Da completare"}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Valore corrente</p>
          <p className="font-semibold">{value > 0 ? eur(value) : "Da completare"}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Profit / Loss</p>
          <p
            className={
              cost > 0 && value > 0
                ? profit >= 0
                  ? "font-semibold text-emerald-400"
                  : "font-semibold text-destructive"
                : "font-semibold"
            }
          >
            {cost > 0 && value > 0 ? eur(profit) : "Da completare"}
          </p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">ROI</p>
          <p className="font-semibold">
            {currentRoi == null
              ? "Da completare"
              : `${currentRoi >= 0 ? "+" : ""}${currentRoi.toFixed(1)}%`}
          </p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Target vendita</p>
          <p className="font-semibold">
            {decision?.buy_it_now_price ? eur(decision.buy_it_now_price) : "Da completare"}
          </p>
        </div>
      </div>
      <p className="mt-3 text-sm">
        <span className="text-muted-foreground">Minimo accettabile:</span>{" "}
        {decision?.min_acceptable_price ? eur(decision.min_acceptable_price) : "Da completare"}
      </p>
      <div className="mt-3 rounded-md bg-muted/50 p-3">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Motivazione
        </p>
        <p className="mt-1 text-sm">
          {decision?.rationale ||
            "Da completare: inserisci valore di mercato e costo d'acquisto prima di decidere se tenere, vendere, attendere o fare upgrade."}
        </p>
      </div>
    </section>
  );
}
