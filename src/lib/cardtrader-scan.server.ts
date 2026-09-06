/**
 * Motore del Radar Occasioni CardTrader.
 * Server-only: usa il token CardTrader e il client Supabase service-role.
 * Idempotente: la stessa offerta (user_id, product_id) viene aggiornata, mai duplicata.
 */
import {
  computeDealScore,
  conditionRank,
  ctExpansions,
  ctGames,
  ctMarketplaceByExpansion,
  dealUrl,
  hasCardtraderToken,
  isZeroEligible,
  mean,
  productCondition,
  productCurrency,
  productFoil,
  productLanguage,
  productNumber,
  productPrice,
  sendTelegram,
  type CtProduct,
} from "./cardtrader.server";

export type ScanResult = {
  status: "ok" | "not_configured" | "disabled" | "error";
  message: string;
  scannedExpansions: number;
  inserted: number;
  updated: number;
  expired: number;
  alerts: number;
};

const MAX_EXPANSIONS_PER_RUN = 6;
const MIN_COMPARABLES = 3;

function norm(value: string | null | undefined): string {
  return (value ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "");
}

export async function scanCardtraderForUser(userId: string): Promise<ScanResult> {
  const empty = { scannedExpansions: 0, inserted: 0, updated: 0, expired: 0, alerts: 0 };
  if (!hasCardtraderToken()) {
    return {
      status: "not_configured",
      message: "Token CardTrader non configurato: nessuna scansione eseguita.",
      ...empty,
    };
  }
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const { data: settings } = await supabaseAdmin
    .from("cardtrader_settings")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (!settings || !settings.radar_enabled) {
    return { status: "disabled", message: "Radar CardTrader disattivato.", ...empty };
  }

  const threshold = Math.max(30, Number(settings.discount_threshold ?? 30));
  const maxPrice = Number(settings.max_price ?? 100);
  const allowedConditions = (settings.allowed_conditions ?? []).map((c: string) => norm(c));
  const allowedLanguages = (settings.languages ?? []).map((l: string) => norm(l));

  try {
    const games = await ctGames();
    const pokemon = games.find((g) => norm(g.name).includes("pokemon"));
    const expansions = (await ctExpansions()).filter(
      (e) => !pokemon || e.game_id === pokemon.id,
    );

    // Priorità: le espansioni già presenti in collezione (utili a set e flip conosciuti),
    // poi le altre a rotazione oraria, così il radar copre tutto il mercato nel tempo.
    const { data: cards } = await supabaseAdmin
      .from("cards")
      .select("set_name, set_code, items!inner(user_id)")
      .eq("items.user_id", userId);
    const owned = new Set(
      (cards ?? []).flatMap((c: { set_name: string | null; set_code: string | null }) =>
        [norm(c.set_name), norm(c.set_code)].filter(Boolean),
      ),
    );
    const priority = expansions.filter((e) => owned.has(norm(e.name)) || owned.has(norm(e.code)));
    const rest = expansions.filter((e) => !priority.includes(e));
    const rotation = new Date().getUTCHours() % Math.max(1, Math.ceil(rest.length / 3));
    const selected = [...priority, ...rest.slice(rotation * 3, rotation * 3 + 3)].slice(
      0,
      MAX_EXPANSIONS_PER_RUN,
    );

    const candidates: Record<string, unknown>[] = [];

    for (const expansion of selected) {
      let products: CtProduct[] = [];
      try {
        products = await ctMarketplaceByExpansion(expansion.id);
      } catch {
        continue;
      }
      // Gruppi comparabili: stessa carta, stessa lingua, stessa variante, STESSA condizione.
      const groups = new Map<string, CtProduct[]>();
      for (const product of products) {
        if (product.on_vacation) continue;
        const key = [
          product.blueprint_id,
          norm(productLanguage(product)),
          norm(productCondition(product)),
          productFoil(product) ? "foil" : "plain",
        ].join("|");
        groups.set(key, [...(groups.get(key) ?? []), product]);
      }

      for (const group of groups.values()) {
        if (group.length < MIN_COMPARABLES) continue;
        const prices = group.map(productPrice).filter((p) => p > 0);
        if (prices.length < MIN_COMPARABLES) continue;
        // Sniping reale: considera solo l'offerta più bassa del gruppo e richiede
        // un vero salto rispetto alla successiva (stessa lingua/condizione/variante).
        // Es. 2 € vs prossima a 6 € = occasione; 2 € vs 2,01 € = no.
        const sorted = [...group].sort((a, b) => productPrice(a) - productPrice(b));
        const [cheapest, second] = sorted;
        if (!cheapest || !second) continue;
        const nextPrice = productPrice(second);
        const cheapestPrice = productPrice(cheapest);
        if (
          cheapestPrice <= 0 ||
          nextPrice <= 0 ||
          nextPrice < cheapestPrice * 1.3 // salto minimo 30% sulla prossima offerta
        ) {
          continue;
        }
        for (const product of [cheapest]) {
          const price = productPrice(product);
          if (price <= 0 || price > maxPrice) continue;
          const condition = productCondition(product);
          if (allowedConditions.length && !allowedConditions.includes(norm(condition))) continue;
          const language = productLanguage(product);
          if (allowedLanguages.length && !allowedLanguages.includes(norm(language))) continue;

          const others = group.filter((p) => p.id !== product.id).map(productPrice).filter((p) => p > 0);
          const benchmark = mean(others);
          if (!benchmark || benchmark <= 0) continue;
          const discount = ((benchmark - price) / benchmark) * 100;
          if (discount < threshold) continue;
          // Solo offerte CardTrader Zero (niente spese di spedizione separate)
          if (!isZeroEligible(product)) continue;
          // Ricavo potenziale minimo: almeno 5 € tra prezzo e benchmark
          if (benchmark - price < 5) continue;

          const scores = computeDealScore({
            discountPct: discount,
            condition,
            competingListings: others.length,
            zeroEligible: isZeroEligible(product),
          });
          candidates.push({
            user_id: userId,
            product_id: String(product.id),
            blueprint_id: String(product.blueprint_id),
            expansion_code: expansion.code,
            card_name: product.name_en ?? "",
            set_name: expansion.name,
            card_number: productNumber(product),
            language,
            condition,
            foil: productFoil(product),
            price,
            currency: productCurrency(product),
            benchmark,
            benchmark_source: `CardTrader media ${others.length} offerte stessa condizione e lingua`,
            discount_pct: Math.round(discount * 10) / 10,
            margin: Math.round((benchmark - price) * 100) / 100,
            roi: Math.round(((benchmark - price) / price) * 1000) / 10,
            liquidity_score: scores.liquidityScore,
            quality_score: scores.qualityScore,
            deal_score: scores.dealScore,
            seller_name: product.user?.username ?? null,
            seller_country: product.user?.country_code ?? null,
            zero_eligible: isZeroEligible(product),
            url: dealUrl(product),
            last_seen_at: new Date().toISOString(),
          });
        }
      }
    }

    // Ordina per qualità dell'affare e limita la scrittura alle occasioni migliori.
    candidates.sort((a, b) => Number(b["deal_score"]) - Number(a["deal_score"]));
    const best = candidates.slice(0, 120);

    const { data: existing } = await supabaseAdmin
      .from("cardtrader_deals")
      .select("id, product_id, status")
      .eq("user_id", userId);
    const known = new Map((existing ?? []).map((d) => [d.product_id, d]));

    const toInsert = best.filter((c) => !known.has(String(c["product_id"])));
    const toUpdate = best.filter((c) => known.has(String(c["product_id"])));

    if (toInsert.length) {
      await supabaseAdmin.from("cardtrader_deals").insert(toInsert as never);
    }
    for (const candidate of toUpdate) {
      const { user_id: _u, product_id, ...fields } = candidate;
      await supabaseAdmin
        .from("cardtrader_deals")
        .update(fields as never)
        .eq("user_id", userId)
        .eq("product_id", String(product_id));
    }

    const cutoff = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
    const { data: expiredRows } = await supabaseAdmin
      .from("cardtrader_deals")
      .update({ status: "EXPIRED" })
      .eq("user_id", userId)
      .in("status", ["NEW", "SEEN"])
      .lt("last_seen_at", cutoff)
      .select("id");

    // Alert immediato per gli affari eccezionali appena trovati.
    let alerts = 0;
    const alertScore = Number(settings.alert_deal_score ?? 90);
    const alertDiscount = Number(settings.alert_discount ?? 45);
    const exceptional = toInsert.filter(
      (c) => Number(c["deal_score"]) >= alertScore || Number(c["discount_pct"]) >= alertDiscount,
    );
    const { sendPushToUser } = await import("./webpush.server");
    const { sendWhatsapp, isWhatsappConfigured } = await import("./whatsapp.server");
    for (const deal of exceptional.slice(0, 5)) {
      const text =
        `TCG Vault — affare CardTrader\n${deal["card_name"]} (${deal["set_name"]})\n` +
        `${deal["condition"]} ${deal["language"] ?? ""}\n` +
        `Prezzo ${deal["price"]} € vs benchmark ${deal["benchmark"]} € · -${deal["discount_pct"]}% · score ${deal["deal_score"]}\n` +
        `${deal["url"]}`;
      let sent = false;
      if (settings.telegram_enabled) {
        sent = (await sendTelegram(text)) || sent;
      }
      if (settings.push_enabled) {
        const push = await sendPushToUser(userId, {
          title: `Affare −${deal["discount_pct"]}% · ${deal["card_name"]}`,
          body: `${deal["price"]} € (benchmark ${deal["benchmark"]} €) · ${deal["condition"]} ${deal["language"] ?? ""}`,
          url: "/dashboard",
          tag: `deal-${deal["product_id"]}`,
        });
        sent = push.sent > 0 || sent;
      }
      if (settings.whatsapp_enabled && isWhatsappConfigured()) {
        const wa = await sendWhatsapp(text);
        sent = wa.ok || sent;
      }
      if (sent) {
        alerts += 1;
        await supabaseAdmin
          .from("cardtrader_deals")
          .update({ notified_at: new Date().toISOString() })
          .eq("user_id", userId)
          .eq("product_id", String(deal["product_id"]));
      }
    }


    const message = `Scansione completata: ${toInsert.length} nuove occasioni, ${toUpdate.length} aggiornate.`;
    await supabaseAdmin
      .from("cardtrader_settings")
      .update({
        last_scan_at: new Date().toISOString(),
        last_scan_status: "OK",
        last_scan_message: message,
      })
      .eq("user_id", userId);

    return {
      status: "ok",
      message,
      scannedExpansions: selected.length,
      inserted: toInsert.length,
      updated: toUpdate.length,
      expired: expiredRows?.length ?? 0,
      alerts,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Errore sconosciuto";
    await supabaseAdmin
      .from("cardtrader_settings")
      .update({
        last_scan_at: new Date().toISOString(),
        last_scan_status: "ERROR",
        last_scan_message: message.slice(0, 500),
      })
      .eq("user_id", userId);
    if (message === "CARDTRADER_NOT_CONFIGURED") {
      return { status: "not_configured", message: "Token CardTrader non configurato.", ...empty };
    }
    return { status: "error", message, ...empty };
  }
}

export { conditionRank };
