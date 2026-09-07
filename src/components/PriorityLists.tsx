import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { Award, Check, ShoppingCart, Tag, Camera } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ItemPhoto } from "@/components/ItemPhoto";
import { eur, itemSubtitle, itemTitle } from "@/lib/calc";
import { getCoverImage } from "@/lib/types";
import { setQualityCheck } from "@/lib/mutations";
import type { BuyRowView, GradingRowView, PriorityRow, SellRowView } from "@/lib/priorities";

function Row({
  row,
  tone,
  icon,
  extra,
  action,
}: {
  row: PriorityRow;
  tone: "qc" | "grade" | "sell";
  icon: React.ReactNode;
  extra?: React.ReactNode;
  action?: React.ReactNode;
}) {
  const positive = (row.amount ?? 0) >= 0;
  return (
    <article className="flex items-start gap-3 rounded-xl border border-border bg-card/60 p-3">
      <ItemPhoto
        image={getCoverImage(row.item)}
        alt={itemTitle(row.item)}
        className="h-20 w-14 shrink-0 bg-muted/30 object-contain"
      />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <Badge variant={tone === "sell" ? "default" : "secondary"} className="gap-1">
            {icon}
            {tone === "qc" ? "Quality check" : tone === "grade" ? "Grading" : "Vendita"}
          </Badge>
          {extra}
        </div>
        <p className="mt-1 truncate text-sm font-semibold">{itemTitle(row.item)}</p>
        <p className="truncate text-xs text-muted-foreground">{itemSubtitle(row.item)}</p>
        <p className="mt-1 text-xs text-muted-foreground">{row.reasons.join(" · ")}</p>
        {action ? <div className="mt-2">{action}</div> : null}
      </div>
      <div className="shrink-0 text-right">
        {row.amount != null ? (
          <>
            <p className="text-[11px] text-muted-foreground">{row.amountLabel}</p>
            <p
              className={`text-sm font-bold ${
                tone === "qc" ? "" : positive ? "text-emerald-400" : "text-destructive"
              }`}
            >
              {tone === "qc" ? eur(row.amount) : `${positive ? "+" : ""}${eur(row.amount)}`}
            </p>
          </>
        ) : null}
      </div>
    </article>
  );
}

function Empty({ text }: { text: string }) {
  return <p className="text-sm text-muted-foreground">{text}</p>;
}

export function QualityCheckList({ rows }: { rows: PriorityRow[] }) {
  const qc = useQueryClient();
  const [busy, setBusy] = useState<string | null>(null);

  if (rows.length === 0) {
    return <Empty text="Nessuna carta in attesa di quality check: le schede possedute sono complete." />;
  }

  const complete = async (id: string) => {
    setBusy(id);
    try {
      await setQualityCheck(id, "completed");
      await qc.invalidateQueries({ queryKey: ["items"] });
      toast.success("Quality check completato");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Errore salvataggio");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="grid gap-3 lg:grid-cols-2">
      {rows.map((row) => (
        <Row
          key={row.item.id}
          row={row}
          tone="qc"
          icon={<Camera className="h-3 w-3" />}
          action={
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="outline"
                className="h-9 text-xs"
                disabled={busy === row.item.id}
                onClick={() => void complete(row.item.id)}
              >
                <Check className="mr-1 h-3 w-3" /> QC completato
              </Button>
              <Button asChild size="sm" variant="ghost" className="h-9 text-xs">
                <Link to={row.item.item_type === "SEALED" ? "/sealed" : "/carte"}>Apri scheda</Link>
              </Button>
            </div>
          }
        />
      ))}
    </div>
  );
}

export function GradingPriorityList({ rows }: { rows: GradingRowView[] }) {
  if (rows.length === 0) {
    return (
      <Empty text="Nessuna carta pronta: servono quality check completato, prezzi slab e una valutazione grading con probabilità." />
    );
  }
  return (
    <div className="grid gap-3 lg:grid-cols-2">
      {rows.map((row, index) => (
        <Row
          key={row.item.id}
          row={row}
          tone="grade"
          icon={<Award className="h-3 w-3" />}
          extra={
            <>
              <Badge variant="outline">Priorità {index + 1}</Badge>
              {row.roi != null ? <Badge variant="outline">ROI {row.roi.toFixed(0)}%</Badge> : null}
            </>
          }
          action={
            <Button asChild size="sm" variant="ghost" className="h-9 px-2 text-xs">
              <Link to="/grading">Apri grading</Link>
            </Button>
          }
        />
      ))}
    </div>
  );
}

export function SellPriorityList({ rows }: { rows: SellRowView[] }) {
  if (rows.length === 0) {
    return (
      <Empty text="Nessuna carta da vendere: servono quality check completato, valore di mercato e una motivazione reale." />
    );
  }
  return (
    <div className="grid gap-3 lg:grid-cols-2">
      {rows.map((row, index) => (
        <Row
          key={row.item.id}
          row={row}
          tone="sell"
          icon={<Tag className="h-3 w-3" />}
          extra={
            <>
              <Badge variant="outline">Priorità {index + 1}</Badge>
              {row.suggestedPrice ? (
                <Badge variant="outline">Prezzo suggerito {eur(row.suggestedPrice)}</Badge>
              ) : null}
            </>
          }
          action={
            <Button asChild size="sm" variant="ghost" className="h-9 px-2 text-xs">
              <Link to="/vendite">Registra vendita</Link>
            </Button>
          }
        />
      ))}
    </div>
  );
}

export function BuyPriorityList({ rows }: { rows: BuyRowView[] }) {
  if (rows.length === 0) {
    return (
      <Empty text="Nessuna carta mancante calcolabile: aggiungi set, numero e totale del set alle tue carte." />
    );
  }
  return (
    <div className="grid gap-2">
      {rows.map((row, index) => (
        <div
          key={row.key}
          className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card/60 p-3"
        >
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">
              {row.group.setName} — #{row.number}
            </p>
            <p className="truncate text-xs text-muted-foreground">
              {row.group.language} · {row.group.variant} · set al {row.percent.toFixed(0)}% ·{" "}
              {row.missing} mancanti
            </p>
          </div>
          <div className="shrink-0 text-right">
            <Badge variant="secondary">Priorità {index + 1}</Badge>
            <p className="mt-1 text-xs text-muted-foreground">
              {row.targetPrice != null ? `Target ${eur(row.targetPrice)}` : "Target n/d"}
            </p>
          </div>
        </div>
      ))}
      <Button asChild size="sm" variant="outline" className="mt-1 w-fit">
        <Link to="/occasioni">
          <ShoppingCart className="mr-1 h-3 w-3" /> Cerca offerte
        </Link>
      </Button>
    </div>
  );
}
