import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Server functions CardTrader. Il token resta esclusivamente lato server:
 * il client riceve solo esiti e dati pubblici dell'offerta.
 */

export const cardtraderStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    const { hasCardtraderToken, ctInfo } = await import("./cardtrader.server");
    const telegramConfigured =
      !!process.env["TELEGRAM_BOT_TOKEN"] && !!process.env["TELEGRAM_CHAT_ID"];
    const pushConfigured = !!process.env["VAPID_PUBLIC_KEY"] && !!process.env["VAPID_PRIVATE_KEY"];
    const { isWhatsappConfigured } = await import("./whatsapp.server");
    const whatsappConfigured = isWhatsappConfigured();
    if (!hasCardtraderToken()) {
      return {
        connected: false,
        tokenConfigured: false,
        telegramConfigured,
        pushConfigured,
        whatsappConfigured,
        account: null as string | null,
        error: "Token CardTrader non configurato.",
      };
    }
    try {
      const info = await ctInfo();
      return {
        connected: true,
        tokenConfigured: true,
        telegramConfigured,
        pushConfigured,
        whatsappConfigured,
        account: info?.name ?? info?.email ?? "Account CardTrader",
        error: null as string | null,
      };
    } catch (error) {
      return {
        connected: false,
        tokenConfigured: true,
        telegramConfigured,
        pushConfigured,
        whatsappConfigured,
        account: null as string | null,
        error: error instanceof Error ? error.message : "Connessione fallita",
      };
    }
  });

export const runCardtraderScan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { scanCardtraderForUser } = await import("./cardtrader-scan.server");
    return scanCardtraderForUser(context.userId);
  });

export const searchCardtraderBlueprints = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { query: string }) => input)
  .handler(async ({ data }) => {
    const { ctExpansions, ctBlueprints, ctGames, hasCardtraderToken } = await import(
      "./cardtrader.server"
    );
    if (!hasCardtraderToken()) return { configured: false, results: [] };
    const term = data.query.trim().toLowerCase();
    if (term.length < 3) return { configured: true, results: [] };
    const games = await ctGames();
    const pokemon = games.find((g) => g.name.toLowerCase().includes("pokemon"));
    const expansions = (await ctExpansions()).filter((e) => !pokemon || e.game_id === pokemon.id);
    const results: { id: number; name: string; expansion: string }[] = [];
    for (const expansion of expansions.slice(0, 40)) {
      if (results.length >= 25) break;
      try {
        const blueprints = await ctBlueprints(expansion.id);
        for (const blueprint of blueprints) {
          if (blueprint.name.toLowerCase().includes(term)) {
            results.push({ id: blueprint.id, name: blueprint.name, expansion: expansion.name });
            if (results.length >= 25) break;
          }
        }
      } catch {
        continue;
      }
    }
    return { configured: true, results };
  });

export const publishCardtraderListing = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: {
      itemId: string;
      blueprintId: string;
      price: number;
      quantity: number;
      condition: string;
      language: string;
      description?: string;
    }) => input,
  )
  .handler(async ({ data, context }) => {
    const { ctCreateProduct, hasCardtraderToken } = await import("./cardtrader.server");
    const { supabase, userId } = context;
    if (!hasCardtraderToken()) {
      return { ok: false as const, error: "Token CardTrader non configurato." };
    }
    try {
      const created = await ctCreateProduct({
        blueprint_id: Number(data.blueprintId),
        price: data.price,
        quantity: data.quantity,
        description: data.description ?? "",
        properties: { condition: data.condition, pokemon_language: data.language },
      });
      const { error } = await supabase.from("cardtrader_listings").upsert(
        {
          user_id: userId,
          item_id: data.itemId,
          blueprint_id: data.blueprintId,
          listing_id: created.id ? String(created.id) : null,
          price: data.price,
          quantity: data.quantity,
          condition: data.condition,
          language: data.language,
          status: created.id ? "PUBLISHED" : "DRAFT",
          last_error: null,
          synced_at: new Date().toISOString(),
        },
        { onConflict: "user_id,item_id" },
      );
      if (error) return { ok: false as const, error: error.message };
      return { ok: true as const, listingId: created.id ? String(created.id) : null };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Pubblicazione fallita";
      await supabase.from("cardtrader_listings").upsert(
        {
          user_id: userId,
          item_id: data.itemId,
          blueprint_id: data.blueprintId,
          price: data.price,
          quantity: data.quantity,
          condition: data.condition,
          language: data.language,
          status: "ERROR",
          last_error: message.slice(0, 500),
        },
        { onConflict: "user_id,item_id" },
      );
      return { ok: false as const, error: message };
    }
  });

export const updateCardtraderListing = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { itemId: string; price: number; quantity: number }) => input)
  .handler(async ({ data, context }) => {
    const { ctUpdateProduct, hasCardtraderToken } = await import("./cardtrader.server");
    const { supabase, userId } = context;
    const { data: listing } = await supabase
      .from("cardtrader_listings")
      .select("*")
      .eq("user_id", userId)
      .eq("item_id", data.itemId)
      .maybeSingle();
    if (!listing) return { ok: false as const, error: "Inserzione non trovata." };
    if (listing.listing_id && hasCardtraderToken()) {
      try {
        await ctUpdateProduct(listing.listing_id, {
          price: data.price,
          quantity: data.quantity,
        });
      } catch (error) {
        return {
          ok: false as const,
          error: error instanceof Error ? error.message : "Aggiornamento fallito",
        };
      }
    }
    const { error } = await supabase
      .from("cardtrader_listings")
      .update({ price: data.price, quantity: data.quantity, synced_at: new Date().toISOString() })
      .eq("id", listing.id);
    if (error) return { ok: false as const, error: error.message };
    return { ok: true as const };
  });

export const removeCardtraderListing = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { itemId: string }) => input)
  .handler(async ({ data, context }) => {
    const { ctDeleteProduct, hasCardtraderToken } = await import("./cardtrader.server");
    const { supabase, userId } = context;
    const { data: listing } = await supabase
      .from("cardtrader_listings")
      .select("*")
      .eq("user_id", userId)
      .eq("item_id", data.itemId)
      .maybeSingle();
    if (!listing) return { ok: false as const, error: "Inserzione non trovata." };
    if (listing.listing_id && hasCardtraderToken()) {
      try {
        await ctDeleteProduct(listing.listing_id);
      } catch (error) {
        return {
          ok: false as const,
          error: error instanceof Error ? error.message : "Rimozione fallita",
        };
      }
    }
    const { error } = await supabase.from("cardtrader_listings").delete().eq("id", listing.id);
    if (error) return { ok: false as const, error: error.message };
    return { ok: true as const };
  });

export const sendCardtraderTestAlert = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    const { sendTelegram } = await import("./cardtrader.server");
    const sent = await sendTelegram("TCG Vault — test notifiche Radar CardTrader.");
    return { sent };
  });
