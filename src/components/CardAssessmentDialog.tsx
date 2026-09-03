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
import { saveCondition, saveGrading } from "@/lib/mutations";
import { CONDITIONS, PSA_GRADES, RECOMMENDATIONS, type ItemRow } from "@/lib/types";

type Form = {
  overall_condition: string;
  centering_front: string;
  centering_back: string;
  surface_front: string;
  surface_back: string;
  edges: string;
  corners: string;
  whitening: string;
  scratches: string;
  print_lines: string;
  dents: string;
  creases: string;
  stains: string;
  condition_notes: string;
  grading_company: string;
  min_grade: string;
  probable_grade: string;
  max_grade: string;
  prob_psa1: string;
  prob_psa2: string;
  prob_psa3: string;
  prob_psa4: string;
  prob_psa5: string;
  prob_psa6: string;
  prob_psa7: string;
  prob_psa8: string;
  prob_psa9: string;
  prob_psa10: string;
  confidence: string;
  recommendation: string;
  grading_cost: string;
  grading_notes: string;
};

const DEFECTS: Array<[keyof Form, string, string]> = [
  ["surface_front", "Superficie fronte", "Pulita, micrograffi, print line…"],
  ["surface_back", "Superficie retro", "Pulita, graffi, sporco…"],
  ["edges", "Bordi", "Puliti, usura lieve/diffusa…"],
  ["corners", "Angoli", "Netti, smussati, piegati…"],
  ["whitening", "Whitening", "Assente, punti, lieve, diffuso…"],
  ["scratches", "Graffi", "Assenti, hairline, evidenti…"],
  ["print_lines", "Print line", "Assenti oppure posizione e quantità"],
  ["dents", "Dent/ammaccature", "Assenti oppure posizione"],
  ["creases", "Pieghe", "Assenti oppure posizione"],
  ["stains", "Macchie/alterazioni", "Assenti, sporco, ink, umidità…"],
];

function initialForm(): Form {
  return {
    overall_condition: "NM",
    centering_front: "",
    centering_back: "",
    surface_front: "",
    surface_back: "",
    edges: "",
    corners: "",
    whitening: "",
    scratches: "",
    print_lines: "",
    dents: "",
    creases: "",
    stains: "",
    condition_notes: "",
    grading_company: "PSA",
    min_grade: "",
    probable_grade: "",
    max_grade: "",
    prob_psa1: "0",
    prob_psa2: "0",
    prob_psa3: "0",
    prob_psa4: "0",
    prob_psa5: "0",
    prob_psa6: "0",
    prob_psa7: "0",
    prob_psa8: "0",
    prob_psa9: "0",
    prob_psa10: "0",
    confidence: "",
    recommendation: "VALUTA",
    grading_cost: "",
    grading_notes: "",
  };
}

function optionalNumber(value: string): number | null {
  return value === "" ? null : Number(value);
}

export function CardAssessmentDialog({ item, trigger }: { item: ItemRow; trigger: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Form>(initialForm);
  const queryClient = useQueryClient();
  const set = <K extends keyof Form>(key: K, value: Form[K]) =>
    setForm((current) => ({ ...current, [key]: value }));

  const mutation = useMutation({
    mutationFn: async () => {
      const min = optionalNumber(form.min_grade);
      const probable = optionalNumber(form.probable_grade);
      const max = optionalNumber(form.max_grade);
      if (min === null || probable === null || max === null) {
        throw new Error("Inserisci voto minimo, probabile e massimo");
      }
      if (min < 1 || max > 10 || min > probable || probable > max) {
        throw new Error("Il range deve rispettare: minimo ≤ probabile ≤ massimo, tra 1 e 10");
      }
      const probabilities = [
        form.prob_psa1,
        form.prob_psa2,
        form.prob_psa3,
        form.prob_psa4,
        form.prob_psa5,
        form.prob_psa6,
        form.prob_psa7,
        form.prob_psa8,
        form.prob_psa9,
        form.prob_psa10,
      ].map(Number);
      if (probabilities.some((value) => !Number.isFinite(value) || value < 0 || value > 100)) {
        throw new Error("Ogni probabilità deve essere compresa tra 0 e 100");
      }
      const sum = probabilities.reduce((total, value) => total + value, 0);
      if (Math.abs(sum - 100) > 0.01) {
        throw new Error(`Le probabilità PSA 6–10 devono sommare 100% (ora ${sum}%)`);
      }

      await saveCondition({
        item_id: item.id,
        overall_condition: form.overall_condition,
        centering_front: form.centering_front || null,
        centering_back: form.centering_back || null,
        surface_front: form.surface_front || null,
        surface_back: form.surface_back || null,
        edges: form.edges || null,
        corners: form.corners || null,
        whitening: form.whitening || null,
        scratches: form.scratches || null,
        print_lines: form.print_lines || null,
        dents: form.dents || null,
        creases: form.creases || null,
        stains: form.stains || null,
        notes: form.condition_notes || null,
      });
      await saveGrading({
        item_id: item.id,
        grading_company: form.grading_company,
        min_grade: min,
        probable_grade: probable,
        max_grade: max,
        prob_psa1: probabilities[0],
        prob_psa2: probabilities[1],
        prob_psa3: probabilities[2],
        prob_psa4: probabilities[3],
        prob_psa5: probabilities[4],
        prob_psa6: probabilities[5],
        prob_psa7: probabilities[6],
        prob_psa8: probabilities[7],
        prob_psa9: probabilities[8],
        prob_psa10: probabilities[9],
        confidence: optionalNumber(form.confidence),
        recommendation: form.recommendation,
        grading_cost: optionalNumber(form.grading_cost),
        notes: form.grading_notes || null,
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["items"] });
      toast.success("Condizione e stima grading salvate");
      setOpen(false);
      setForm(initialForm());
    },
    onError: (error: Error) => toast.error(error.message),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Analisi carta e stima grading</DialogTitle>
          <DialogDescription>
            Valuta la carta sotto luce diffusa, senza sleeve, osservando fronte, retro e riflessi
            obliqui.
          </DialogDescription>
        </DialogHeader>

        <section className="space-y-4">
          <h3 className="font-semibold text-red-300">1. Condizione osservata</h3>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label>Condizione generale</Label>
              <select
                className="h-10 w-full rounded-md border border-input bg-background px-3"
                value={form.overall_condition}
                onChange={(event) => set("overall_condition", event.target.value)}
              >
                {CONDITIONS.map((condition) => (
                  <option key={condition}>{condition}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>Centratura fronte</Label>
              <Input
                value={form.centering_front}
                onChange={(event) => set("centering_front", event.target.value)}
                placeholder="es. 55/45"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Centratura retro</Label>
              <Input
                value={form.centering_back}
                onChange={(event) => set("centering_back", event.target.value)}
                placeholder="es. 60/40"
              />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {DEFECTS.map(([key, label, placeholder]) => (
              <div key={key} className="space-y-1.5">
                <Label>{label}</Label>
                <Input
                  value={form[key]}
                  onChange={(event) => set(key, event.target.value)}
                  placeholder={placeholder}
                />
              </div>
            ))}
          </div>
          <div className="space-y-1.5">
            <Label>Note sulla condizione</Label>
            <Textarea
              value={form.condition_notes}
              onChange={(event) => set("condition_notes", event.target.value)}
            />
          </div>
        </section>

        <section className="space-y-4 border-t border-border pt-4">
          <h3 className="font-semibold text-cyan-300">2. Stima pre-grading</h3>
          <div className="grid gap-4 sm:grid-cols-4">
            <div className="space-y-1.5">
              <Label>Società</Label>
              <Input
                value={form.grading_company}
                onChange={(event) => set("grading_company", event.target.value)}
              />
            </div>
            {(["min_grade", "probable_grade", "max_grade"] as const).map((key, index) => (
              <div key={key} className="space-y-1.5">
                <Label>{["Minimo", "Probabile", "Massimo"][index]}</Label>
                <Input
                  type="number"
                  min="1"
                  max="10"
                  step="0.5"
                  value={form[key]}
                  onChange={(event) => set(key, event.target.value)}
                />
              </div>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
            {PSA_GRADES.map((grade) => {
              const key = `prob_psa${grade}` as keyof Form;
              return (
                <div key={grade} className="space-y-1.5">
                  <Label>PSA {grade} %</Label>
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    value={form[key]}
                    onChange={(event) => set(key, event.target.value)}
                  />
                </div>
              );
            })}
          </div>
          <p className="text-xs text-muted-foreground">
            Distribuisci il 100% tra tutti i voti plausibili: il valore economico atteso userà
            solamente i prezzi PSA inseriti per quei voti.
          </p>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label>Confidenza %</Label>
              <Input
                type="number"
                min="0"
                max="100"
                value={form.confidence}
                onChange={(event) => set("confidence", event.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Raccomandazione</Label>
              <select
                className="h-10 w-full rounded-md border border-input bg-background px-3"
                value={form.recommendation}
                onChange={(event) => set("recommendation", event.target.value)}
              >
                {RECOMMENDATIONS.map((value) => (
                  <option key={value}>{value}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>Costo grading €</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={form.grading_cost}
                onChange={(event) => set("grading_cost", event.target.value)}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Motivazione della stima</Label>
            <Textarea
              value={form.grading_notes}
              onChange={(event) => set("grading_notes", event.target.value)}
              placeholder="Indica il difetto che limita il voto e perché…"
            />
          </div>
        </section>

        <DialogFooter>
          <Button onClick={() => mutation.mutate()} disabled={mutation.isPending}>
            {mutation.isPending ? "Salvataggio…" : "Salva analisi e stima"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
