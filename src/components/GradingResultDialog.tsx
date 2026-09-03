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
import { saveGradingResult } from "@/lib/mutations";
import type { GradingRow } from "@/lib/types";

export function GradingResultDialog({
  grading,
  trigger,
}: {
  grading: GradingRow;
  trigger: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [company, setCompany] = useState(
    grading.actual_company || grading.grading_company || "PSA",
  );
  const [grade, setGrade] = useState(grading.actual_grade ? String(grading.actual_grade) : "");
  const [certificate, setCertificate] = useState(grading.certificate_number || "");
  const [submittedAt, setSubmittedAt] = useState(grading.submitted_at || "");
  const [gradedAt, setGradedAt] = useState(grading.graded_at || "");
  const [returnedAt, setReturnedAt] = useState(grading.returned_at || "");
  const [cost, setCost] = useState(
    grading.actual_grading_cost ? String(grading.actual_grading_cost) : "",
  );
  const [notes, setNotes] = useState(grading.result_notes || "");
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async () => {
      const numericGrade = Number(grade);
      if (!Number.isFinite(numericGrade) || numericGrade < 1 || numericGrade > 10)
        throw new Error("Inserisci un voto effettivo tra 1 e 10");
      await saveGradingResult(grading.id, {
        actual_company: company.trim() || grading.grading_company,
        actual_grade: numericGrade,
        certificate_number: certificate.trim() || null,
        submitted_at: submittedAt || null,
        graded_at: gradedAt || null,
        returned_at: returnedAt || null,
        actual_grading_cost: cost ? Number(cost) : null,
        result_notes: notes.trim() || null,
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["items"] });
      toast.success("Risultato grading salvato");
      setOpen(false);
    },
    onError: (error: Error) => toast.error(error.message),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Registra voto effettivo</DialogTitle>
          <DialogDescription>
            Il risultato resta collegato alla stima originale per misurarne l’accuratezza.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Società</Label>
            <Input value={company} onChange={(event) => setCompany(event.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Voto effettivo *</Label>
            <Input
              type="number"
              min="1"
              max="10"
              step="0.5"
              value={grade}
              onChange={(event) => setGrade(event.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Numero certificato</Label>
            <Input value={certificate} onChange={(event) => setCertificate(event.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Costo effettivo €</Label>
            <Input
              type="number"
              min="0"
              step="0.01"
              value={cost}
              onChange={(event) => setCost(event.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Data invio</Label>
            <Input
              type="date"
              value={submittedAt}
              onChange={(event) => setSubmittedAt(event.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Data grading</Label>
            <Input
              type="date"
              value={gradedAt}
              onChange={(event) => setGradedAt(event.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Data rientro</Label>
            <Input
              type="date"
              value={returnedAt}
              onChange={(event) => setReturnedAt(event.target.value)}
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label>Note sul risultato</Label>
          <Textarea value={notes} onChange={(event) => setNotes(event.target.value)} />
        </div>
        <DialogFooter>
          <Button onClick={() => mutation.mutate()} disabled={mutation.isPending}>
            {mutation.isPending ? "Salvataggio…" : "Salva risultato"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
