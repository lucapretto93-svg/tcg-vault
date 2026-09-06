import { Link } from "@tanstack/react-router";
import { Award, ArrowUpRight, Tag } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ItemPhoto } from "@/components/ItemPhoto";
import { eur, itemSubtitle, itemTitle } from "@/lib/calc";
import { getCoverImage } from "@/lib/types";
import { MOVE_LABELS, type MoveRow } from "@/lib/actions";

export function MoveItem({ row }: { row: MoveRow }) {
  const grade = row.kind === "GRADE";
  return (
    <article className="flex items-center gap-3 rounded-xl border border-border bg-card/60 p-3">
      <ItemPhoto
        image={getCoverImage(row.item)}
        alt={itemTitle(row.item)}
        className="h-20 w-14 shrink-0 bg-muted/30 object-contain"
      />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <Badge variant={grade ? "secondary" : "default"} className="gap-1">
            {grade ? <Award className="h-3 w-3" /> : <Tag className="h-3 w-3" />}
            {MOVE_LABELS[row.kind]}
          </Badge>
          {row.stale ? <Badge variant="outline">Prezzo da aggiornare</Badge> : null}
        </div>
        <p className="mt-1 truncate text-sm font-semibold">{itemTitle(row.item)}</p>
        <p className="truncate text-xs text-muted-foreground">{itemSubtitle(row.item)}</p>
        <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{row.reason}</p>
      </div>
      <div className="shrink-0 text-right">
        <p className="text-xs text-muted-foreground">{grade ? "Uplift atteso" : "Profitto"}</p>
        <p className={`text-sm font-bold ${row.gain >= 0 ? "text-emerald-400" : "text-destructive"}`}>
          {row.gain >= 0 ? "+" : ""}
          {eur(row.gain)}
        </p>
        <p className="text-[11px] text-muted-foreground">Valore {eur(row.value)}</p>
        <Button asChild size="sm" variant="ghost" className="mt-1 h-9 px-2 text-xs">
          <Link to={grade ? "/grading" : row.item.item_type === "SEALED" ? "/sealed" : "/carte"}>
            Apri <ArrowUpRight className="ml-1 h-3 w-3" />
          </Link>
        </Button>
      </div>
    </article>
  );
}

export function MoveList({ rows }: { rows: MoveRow[] }) {
  if (rows.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Nessuna carta da muovere: servono prezzi aggiornati, una valutazione grading o una strategia
        di vendita.
      </p>
    );
  }
  return (
    <div className="grid gap-3 lg:grid-cols-2">
      {rows.map((row) => (
        <MoveItem key={`${row.item.id}-${row.kind}`} row={row} />
      ))}
    </div>
  );
}
