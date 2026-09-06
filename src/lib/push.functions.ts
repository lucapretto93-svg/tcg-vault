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
