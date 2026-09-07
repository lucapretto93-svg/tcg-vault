import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { Award, Check, Languages, ShoppingCart, Tag, Camera } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ItemThumb } from "@/components/ItemThumb";
import { eur, itemSubtitle, itemTitle } from "@/lib/calc";
import { setQualityCheck } from "@/lib/mutations";
import type { BuyRowView, GradingRowView, PriorityRow, SellRowView } from "@/lib/priorities";
import type { SetLanguageRow } from "@/lib/setLanguage";

export type ToneKey = "qc" | "grade" | "sell" | "buy";

export const TONE_CLASS: Record<ToneKey, string> = {
  qc: "tone-qc",
  grade: "tone-grade",
  sell: "tone-sell",
  buy: "tone-buy",
};

function Row({
  row,
  tone,
  icon,
  extra,
  action,
}: {
  row: PriorityRow;
  tone: ToneKey;
  icon: React.ReactNode;
  extra?: React.ReactNode;
  action?: React.ReactNode;
}) {
  const positive = (row.amount ?? 0) >= 0;
  return (
    <article className={`tone-row ${TONE_CLASS[tone]} flex items-start gap-3 rounded-xl border bg-card/60 p-3`}>
      <ItemThumb item={row.item} className="h-[68px] w-12 shrink-0 bg-muted/30 object-contain" />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <Badge variant="outline" className="tone-badge gap-1">
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
      <div className="w-20 shrink-0 text-right">
        {row.amount != null ? (
          <>
            <p className="text-[11px] text-muted-foreground">{row.amountLabel}</p>
            <p
              className={`text-sm font-bold ${
                tone === "qc" ? "tone-accent" : positive ? "tone-accent" : "text-destructive"
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
    <div className="grid gap-3 [&>*]:min-w-0 lg:grid-cols-2">
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
    <div className="grid gap-3 [&>*]:min-w-0 lg:grid-cols-2">
      {rows.map((row, index) => (
        <Row
          key={row.item.id}
          row={row}
          tone="grade"
          icon={<Award className="h-3 w-3" />}
          extra={
            <>
              <Badge variant="outline" className="tone-badge">Priorità {index + 1}</Badge>
              {row.roi != null ? <Badge variant="outline" className="tone-badge">ROI {row.roi.toFixed(0)}%</Badge> : null}
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
    <div className="grid gap-3 [&>*]:min-w-0 lg:grid-cols-2">
      {rows.map((row, index) => (
        <Row
          key={row.item.id}
          row={row}
          tone="sell"
          icon={<Tag className="h-3 w-3" />}
          extra={
            <>
              <Badge variant="outline" className="tone-badge">Priorità {index + 1}</Badge>
              {row.suggestedPrice ? (
                <Badge variant="outline" className="tone-badge">
                  Prezzo suggerito {eur(row.suggestedPrice)}
                </Badge>
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
    <div className="tone-buy grid gap-2">
      {rows.map((row, index) => (
        <div
          key={row.key}
          className="tone-row tone-buy flex items-center justify-between gap-3 rounded-xl border bg-card/60 p-3"
        >
          <div className="min-w-0">
            <div className="mb-1 flex flex-wrap gap-1.5">
              <Badge variant="outline" className="tone-badge">
                {row.kind === "TRADE" ? "Trade/upgrade lingua" : "Mancante"}
              </Badge>
              {row.kind === "TRADE" ? (
                <Badge variant="outline" className="tone-badge">
                  già {row.ownedLanguages.join("/")} → {row.targetLanguage}
                </Badge>
              ) : null}
            </div>
            <p className="truncate text-sm font-semibold">
              {row.group.setName} — #{row.number}
            </p>
            <p className="truncate text-xs text-muted-foreground">
              {row.group.language} · {row.group.variant} · set al {row.percent.toFixed(0)}% ·{" "}
              {row.missing} mancanti
            </p>
          </div>
          <div className="w-20 shrink-0 text-right">
            <Badge variant="outline" className="tone-badge">Priorità {index + 1}</Badge>
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

const LANG_STATUS_TONE: Record<string, string> = {
  MONO_IT: "tone-buy",
  MONO_OTHER: "tone-qc",
  MISTO: "tone-grade",
  DA_VERIFICARE: "tone-sell",
};

export function SetLanguageList({ rows }: { rows: SetLanguageRow[] }) {
  if (rows.length === 0) {
    return (
      <Empty text="Nessun set analizzabile: servono set e lingua sulle carte per valutare la coerenza." />
    );
  }
  return (
    <div className="grid gap-3 [&>*]:min-w-0 lg:grid-cols-2">
      {rows.map((row) => (
        <div
          key={row.key}
          className={`tone-row ${LANG_STATUS_TONE[row.status] ?? "tone-qc"} rounded-xl border bg-card/60 p-3`}
        >
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge variant="outline" className="tone-badge">
              <Languages className="mr-1 h-3 w-3" />
              {row.statusLabel}
            </Badge>
            {row.targetLanguage ? (
              <Badge variant="outline" className="tone-badge">
                Obiettivo {row.targetLanguage}
              </Badge>
            ) : null}
          </div>
          <p className="mt-1 truncate text-sm font-semibold">{row.setName}</p>
          <p className="truncate text-xs text-muted-foreground">
            {row.counts.map((c) => `${c.language} ${c.count}`).join(" / ")}
            {row.unknownLanguage > 0 ? ` / lingua n/d ${row.unknownLanguage}` : ""}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {row.toReplace > 0
              ? `${row.toReplace} da sostituire per il mono-lingua`
              : "Nessuna sostituzione necessaria"}
          </p>
          {row.offLanguageItems.length > 0 ? (
            <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
              Fuori lingua: {row.offLanguageItems.map((i) => itemTitle(i)).join(", ")}
            </p>
          ) : null}
          {row.suggestion ? (
            <p className="tone-accent mt-1 text-xs font-medium">{row.suggestion}</p>
          ) : null}
        </div>
      ))}
    </div>
  );
}
