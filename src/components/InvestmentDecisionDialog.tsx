import { useState, type ReactNode } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { saveDecision } from "@/lib/mutations";
import {
  DECISION_LABELS,
  INVESTMENT_DECISIONS,
  getLatestDecision,
  type InvestmentDecision,
  type ItemRow,
} from "@/lib/types";

export function InvestmentDecisionDialog({
  item,
  trigger,
}: {
  item: ItemRow;
  trigger: ReactNode;
}) {
  const qc = useQueryClient();
  const existing = getLatestDecision(item);
  const [open, setOpen] = useState(false);
  const [decision, setDecision] = useState<InvestmentDecision>(existing?.decision ?? "HOLD");
  const [rationale, setRationale] = useState(existing?.rationale ?? "");
  const [bin, setBin] = useState(existing?.buy_it_now_price?.toString() ?? "");
  const [min, setMin] = useState(existing?.min_acceptable_price?.toString() ?? "");

  const save = useMutation({
    mutationFn: () =>
      saveDecision({
        itemId: item.id,
        existingId: existing?.id ?? null,
        decision,
        rationale: rationale.trim() || null,
        buy_it_now_price: bin.trim() ? Number(bin) : null,
        min_acceptable_price: min.trim() ? Number(min) : null,
      }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["items"] });
      toast.success("Strategia salvata");
      setOpen(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Strategia investimento</DialogTitle>
          <DialogDescription>
            Decidi se tenere, vendere, attendere o fare upgrade, con motivazione e prezzi target.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {INVESTMENT_DECISIONS.map((d) => (
              <Button
                key={d}
                type="button"
                variant={decision === d ? "default" : "outline"}
                className="min-h-11"
                onClick={() => setDecision(d)}
              >
                {DECISION_LABELS[d]}
              </Button>
            ))}
          </div>
          <div>
            <Label htmlFor="dec-rationale">Motivazione</Label>
            <Textarea
              id="dec-rationale"
              rows={4}
              value={rationale}
              onChange={(e) => setRationale(e.target.value)}
              placeholder="Perché questa scelta: costo, valore di mercato, commissioni, trend…"
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label htmlFor="dec-bin">Target vendita / Buy It Now (€)</Label>
              <Input
                id="dec-bin"
                inputMode="decimal"
                value={bin}
                onChange={(e) => setBin(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="dec-min">Minimo accettabile (€)</Label>
              <Input
                id="dec-min"
                inputMode="decimal"
                value={min}
                onChange={(e) => setMin(e.target.value)}
              />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button disabled={save.isPending} onClick={() => save.mutate()}>
            {save.isPending ? "Salvataggio…" : "Salva strategia"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
