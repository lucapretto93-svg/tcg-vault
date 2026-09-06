import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/** Chiave pubblica VAPID: pubblica per definizione, la privata resta solo lato server. */
export const getPushConfig = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async () => ({
    publicKey: process.env["VAPID_PUBLIC_KEY"] ?? null,
    configured: !!process.env["VAPID_PUBLIC_KEY"] && !!process.env["VAPID_PRIVATE_KEY"],
  }));

export const savePushSubscription = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: { endpoint: string; p256dh: string; auth: string; userAgent?: string }) => input,
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("push_subscriptions").upsert(
      {
        user_id: context.userId,
        endpoint: data.endpoint,
        p256dh: data.p256dh,
        auth: data.auth,
        user_agent: data.userAgent ?? null,
      },
      { onConflict: "endpoint" },
    );
    if (error) return { ok: false as const, error: error.message };
    return { ok: true as const };
  });

/** Invia una notifica di prova ai dispositivi registrati dall'utente. */
export const sendTestPush = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { sendPushToUser } = await import("./webpush.server");
    const result = await sendPushToUser(context.userId, {
      title: "TCG Vault",
      body: "Notifiche attive: ti avviserò quando il Radar trova un affare.",
      url: "/dashboard",
      tag: "test",
    });
    return result;
  });

/** Invia un messaggio WhatsApp di prova (richiede provider configurato). */
export const sendTestWhatsapp = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    const { sendWhatsapp, isWhatsappConfigured } = await import("./whatsapp.server");
    if (!isWhatsappConfigured()) return { ok: false as const, configured: false, error: null as string | null };
    const result = await sendWhatsapp(
      "TCG Vault: notifiche WhatsApp attive. Ti avviserò quando il Radar trova un affare.",
    );
    return { ok: result.ok, configured: true, error: result.error };
  });
