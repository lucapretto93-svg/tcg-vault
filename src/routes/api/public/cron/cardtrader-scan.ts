import { createFileRoute } from "@tanstack/react-router";

/**
 * Scansione oraria del Radar Occasioni CardTrader.
 * Protetta dal secret LOVABLE_CRON_SECRET; idempotente e non distruttiva.
 */
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
  const { scanCardtraderForUser } = await import("@/lib/cardtrader-scan.server");

  const { data: settings, error } = await supabaseAdmin
    .from("cardtrader_settings")
    .select("user_id")
    .eq("radar_enabled", true);
  if (error) return json({ error: error.message }, 500);

  const results = [];
  for (const row of settings ?? []) {
    results.push({ user: row.user_id, ...(await scanCardtraderForUser(row.user_id)) });
  }
  return json({ scanned: results.length, results });
}

export const Route = createFileRoute("/api/public/cron/cardtrader-scan")({
  server: { handlers: { GET: ({ request }) => run(request), POST: ({ request }) => run(request) } },
});
