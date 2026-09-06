import { useMemo, useState } from "react";
import { Copy, ExternalLink, Sparkles, Store } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { buildEbayPrompt } from "@/lib/ebayPrompt";
import { itemTitle } from "@/lib/calc";
import type { ItemRow } from "@/lib/types";

const CHATGPT_URL = "https://chatgpt.com/";
/** Oltre questa soglia l'URL precompilato non è affidabile: si usa il copia-incolla. */
const URL_PROMPT_LIMIT = 3000;

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

export function EbaySellButton({
  item,
  size = "default",
  className,
}: {
  item: ItemRow;
  size?: "default" | "sm";
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const prompt = useMemo(() => buildEbayPrompt(item), [item]);
  const encoded = encodeURIComponent(prompt);
  const canPrefill = encoded.length <= URL_PROMPT_LIMIT;
  const chatUrl = canPrefill ? `${CHATGPT_URL}?q=${encoded}` : CHATGPT_URL;
  const todo = (prompt.match(/DA COMPLETARE/g)?.length ?? 1) - 1;

  const copyOnly = async () => {
    const ok = await copyText(prompt);
    toast[ok ? "success" : "error"](
      ok ? "Prompt copiato negli appunti" : "Copia non riuscita: seleziona il testo manualmente",
    );
  };

  const copyAndOpen = async () => {
    const ok = await copyText(prompt);
    window.open(chatUrl, "_blank", "noopener,noreferrer");
    toast[ok ? "success" : "info"](
      ok
        ? canPrefill
          ? "Prompt inviato a ChatGPT (e copiato negli appunti)"
          : "Prompt copiato: incollalo nella chat appena aperta"
        : "ChatGPT aperto: copia il prompt dal riquadro e incollalo",
    );
  };

  return (
    <>
      <Button
        size={size}
        onClick={() => setOpen(true)}
        className={`bg-gradient-to-r from-red-600 to-amber-500 font-semibold text-white shadow-lg shadow-red-900/30 hover:from-red-500 hover:to-amber-400 ${className ?? ""}`}
      >
        <Store className="h-4 w-4" /> Vendi su eBay
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Prepara inserzione eBay</DialogTitle>
            <DialogDescription>
              {itemTitle(item)} — nessuna pubblicazione automatica: prepari il prompt e ChatGPT ti
              guida passo passo.
            </DialogDescription>
          </DialogHeader>

          {todo > 0 ? (
            <p className="rounded-md border border-amber-400/30 bg-amber-400/10 p-3 text-xs text-amber-200">
              {todo} dat{todo === 1 ? "o" : "i"} mancant{todo === 1 ? "e" : "i"}: segnalat
              {todo === 1 ? "o" : "i"} come DA COMPLETARE, ChatGPT te li chiederà invece di
              inventarli.
            </p>
          ) : (
            <p className="rounded-md border border-emerald-400/30 bg-emerald-400/10 p-3 text-xs text-emerald-200">
              Tutti i dati principali dell’oggetto sono presenti.
            </p>
          )}

          <div className="flex flex-col gap-2 sm:flex-row">
            <Button
              onClick={copyAndOpen}
              className="bg-gradient-to-r from-red-600 to-amber-500 font-semibold text-white hover:from-red-500 hover:to-amber-400"
            >
              <Sparkles className="h-4 w-4" /> Copia e apri ChatGPT
            </Button>
            <Button variant="outline" onClick={copyOnly}>
              <Copy className="h-4 w-4" /> Copia prompt
            </Button>
            <Button variant="ghost" asChild>
              <a href="https://www.ebay.it/sl/sell" target="_blank" rel="noreferrer">
                <ExternalLink className="h-4 w-4" /> Apri eBay
              </a>
            </Button>
          </div>

          <p className="text-xs text-muted-foreground">
            {canPrefill
              ? "Il prompt viene passato direttamente nell’URL di ChatGPT; è comunque negli appunti come riserva."
              : "Prompt troppo lungo per l’URL: viene copiato negli appunti e ChatGPT si apre su una chat nuova, basta incollare."}
          </p>

          <pre className="max-h-72 overflow-auto whitespace-pre-wrap break-words rounded-lg border border-border bg-muted/30 p-3 text-[11px] leading-relaxed">
            {prompt}
          </pre>
        </DialogContent>
      </Dialog>
    </>
  );
}
