/**
 * Notifiche WhatsApp tramite Twilio (API ufficiale).
 * Richiede i secret TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN,
 * TWILIO_WHATSAPP_FROM (es. whatsapp:+14155238886) e WHATSAPP_TO (es. whatsapp:+39...).
 * Senza secret non invia nulla e lo dichiara onestamente.
 */

export function isWhatsappConfigured(): boolean {
  return (
    !!process.env["TWILIO_ACCOUNT_SID"] &&
    !!process.env["TWILIO_AUTH_TOKEN"] &&
    !!process.env["TWILIO_WHATSAPP_FROM"] &&
    !!process.env["WHATSAPP_TO"]
  );
}

export async function sendWhatsapp(message: string): Promise<{ ok: boolean; error: string | null }> {
  if (!isWhatsappConfigured()) return { ok: false, error: "WhatsApp non configurato" };
  const sid = process.env["TWILIO_ACCOUNT_SID"]!;
  const token = process.env["TWILIO_AUTH_TOKEN"]!;
  const from = process.env["TWILIO_WHATSAPP_FROM"]!;
  const to = process.env["WHATSAPP_TO"]!;
  try {
    const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${btoa(`${sid}:${token}`)}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        From: from.startsWith("whatsapp:") ? from : `whatsapp:${from}`,
        To: to.startsWith("whatsapp:") ? to : `whatsapp:${to}`,
        Body: message,
      }),
    });
    if (!response.ok) {
      const text = await response.text();
      console.error(`WhatsApp invio fallito [${response.status}]: ${text}`);
      return { ok: false, error: `Twilio [${response.status}]: ${text.slice(0, 200)}` };
    }
    return { ok: true, error: null };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Errore invio WhatsApp" };
  }
}
