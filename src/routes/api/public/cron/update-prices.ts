import { createFileRoute } from "@tanstack/react-router";

/**
 * Job giornaliero di aggiornamento prezzi.
 *
 * Regole non negoziabili:
 * - non inventa mai prezzi: senza una fonte autorizzata non scrive nulla;
 * - non sovrascrive lo storico: aggiunge SEMPRE nuove righe in market_prices;
 * - idempotente: se per (item, price_type, giorno) esiste già una rilevazione della
 *   stessa fonte, la riesecuzione non aggiunge duplicati;
 * - rispetta lingua/edizione/grade: aggiorna solo il price_type effettivo dell'oggetto
 *   (SEALED, PSAn per gli slab, RAW solo per le carte raw).
 *
 * Per collegare una fonte prezzi basta implementare `fetchProviderPrice` e impostare
 * provider + enabled nella tabella price_sources.
 */

type PriceQuote = { value: number; currency: string; source: string };

/** Nessuna fonte prezzi automatica configurata: qui si innesta il provider autorizzato. */
async function fetchProviderPrice(_params: {
  provider: string;
  itemId: string;
  priceType: string;
  query: Record<string, unknown>;
}): Promise<PriceQuote | null> {
  return null;
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

async function run(request: Request) {
  const secret = process.env["LOVABLE_CRON_SECRET"];
  const provided =
    request.headers.get("x-cron-secret") ??
    request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ??
    "";
  if (!secret || provided !== secret) return json({ error: "Unauthorized" }, 401);

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const { data: sources, error: srcError } = await supabaseAdmin
    .from("price_sources")
    .select("*")
    .eq("enabled", true);
  if (srcError) return json({ error: srcError.message }, 500);

  const active = (sources ?? []).filter((s) => s.provider && s.provider !== "NONE");
  if (active.length === 0) {
    return json({
      status: "no_provider_configured",
      message:
        "Nessuna fonte prezzi autorizzata configurata: nessun prezzo scritto, storico intatto.",
      inserted: 0,
    });
  }

  const today = new Date().toISOString().slice(0, 10);
  let inserted = 0;
  let skipped = 0;

  for (const source of active) {
    const { data: items, error: itemsError } = await supabaseAdmin
      .from("items")
      .select("id, item_type, status, cards(card_state, graded_grade, language, set_name, card_number, card_name, pokemon_name), sealed_products(name, set_name, language)")
      .eq("user_id", source.user_id)
      .neq("status", "SOLD");
    if (itemsError) return json({ error: itemsError.message }, 500);

    for (const item of items ?? []) {
      const card = Array.isArray(item.cards) ? item.cards[0] : item.cards;
      const sealed = Array.isArray(item.sealed_products)
        ? item.sealed_products[0]
        : item.sealed_products;

      let priceType: string | null = null;
      if (item.item_type === "SEALED") priceType = "SEALED";
      else if (card?.card_state === "GRADED" && card.graded_grade)
        priceType = `PSA${Math.round(Number(card.graded_grade))}`;
      else if (card) priceType = "RAW";
      if (!priceType) continue;

      // Idempotenza: una sola rilevazione per fonte, oggetto, tipo e giorno.
      const { data: existing } = await supabaseAdmin
        .from("market_prices")
        .select("id")
        .eq("item_id", item.id)
        .eq("price_type", priceType)
        .eq("source", source.provider)
        .gte("observed_at", `${today}T00:00:00Z`)
        .limit(1);
      if (existing && existing.length > 0) {
        skipped += 1;
        continue;
      }

      const quote = await fetchProviderPrice({
        provider: source.provider,
        itemId: item.id,
        priceType,
        query: { card, sealed },
      });
      if (!quote || !Number.isFinite(quote.value) || quote.value <= 0) {
        skipped += 1;
        continue;
      }

      const { error: insertError } = await supabaseAdmin.from("market_prices").insert({
        item_id: item.id,
        price_type: priceType,
        value: quote.value,
        currency: quote.currency || "EUR",
        source: quote.source || source.provider,
        observed_at: new Date().toISOString(),
      });
      if (insertError) return json({ error: insertError.message }, 500);
      inserted += 1;
    }

    await supabaseAdmin
      .from("price_sources")
      .update({
        last_run_at: new Date().toISOString(),
        last_run_status: inserted > 0 ? "OK" : "NO_DATA",
        last_run_message: `Inserite ${inserted} rilevazioni, ${skipped} saltate.`,
      })
      .eq("id", source.id);
  }

  return json({ status: "ok", inserted, skipped });
}

export const Route = createFileRoute("/api/public/cron/update-prices")({
  server: {
    handlers: {
      GET: ({ request }) => run(request),
      POST: ({ request }) => run(request),
    },
  },
});
