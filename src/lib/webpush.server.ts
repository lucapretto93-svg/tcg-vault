/**
 * Invio notifiche Web Push (RFC 8291 / aes128gcm + VAPID) usando solo Web Crypto,
 * compatibile con il runtime serverless. Nessuna dipendenza Node-only.
 */

const enc = new TextEncoder();

function b64urlToBytes(input: string): Uint8Array {
  const pad = input.replace(/-/g, "+").replace(/_/g, "/");
  const bin = atob(pad + "=".repeat((4 - (pad.length % 4)) % 4));
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i += 1) out[i] = bin.charCodeAt(i);
  return out;
}

function bytesToB64url(bytes: Uint8Array): string {
  let bin = "";
  bytes.forEach((b) => {
    bin += String.fromCharCode(b);
  });
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function concat(...parts: Uint8Array[]): Uint8Array {
  const total = parts.reduce((sum, p) => sum + p.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const p of parts) {
    out.set(p, offset);
    offset += p.length;
  }
  return out;
}

async function hmac(key: Uint8Array, data: Uint8Array): Promise<Uint8Array> {
  const k = await crypto.subtle.importKey("raw", key as BufferSource, { name: "HMAC", hash: "SHA-256" }, false, [
    "sign",
  ]);
  return new Uint8Array(await crypto.subtle.sign("HMAC", k, data as BufferSource));
}

async function hkdfExpand(prk: Uint8Array, info: Uint8Array, length: number): Promise<Uint8Array> {
  const out = await hmac(prk, concat(info, new Uint8Array([1])));
  return out.slice(0, length);
}

function vapidKeys(): { publicKey: string; privateKey: string; subject: string } | null {
  const publicKey = process.env["VAPID_PUBLIC_KEY"];
  const privateKey = process.env["VAPID_PRIVATE_KEY"];
  if (!publicKey || !privateKey) return null;
  return {
    publicKey,
    privateKey,
    subject: process.env["VAPID_SUBJECT"] ?? "mailto:notifiche@tcgvault.app",
  };
}

export function isPushConfigured(): boolean {
  return vapidKeys() !== null;
}

async function vapidHeader(audience: string): Promise<{ authorization: string }> {
  const keys = vapidKeys();
  if (!keys) throw new Error("Chiavi VAPID non configurate");
  const pub = b64urlToBytes(keys.publicKey);
  const jwk: JsonWebKey = {
    kty: "EC",
    crv: "P-256",
    d: keys.privateKey,
    x: bytesToB64url(pub.slice(1, 33)),
    y: bytesToB64url(pub.slice(33, 65)),
    ext: true,
  };
  const signingKey = await crypto.subtle.importKey("jwk", jwk, { name: "ECDSA", namedCurve: "P-256" }, false, [
    "sign",
  ]);
  const header = bytesToB64url(enc.encode(JSON.stringify({ typ: "JWT", alg: "ES256" })));
  const payload = bytesToB64url(
    enc.encode(
      JSON.stringify({
        aud: audience,
        exp: Math.floor(Date.now() / 1000) + 12 * 3600,
        sub: keys.subject,
      }),
    ),
  );
  const unsigned = `${header}.${payload}`;
  const signature = new Uint8Array(
    await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, signingKey, enc.encode(unsigned) as BufferSource),
  );
  return { authorization: `vapid t=${unsigned}.${bytesToB64url(signature)}, k=${keys.publicKey}` };
}

async function encryptPayload(
  p256dh: string,
  auth: string,
  payload: string,
): Promise<Uint8Array> {
  const clientPub = b64urlToBytes(p256dh);
  const authSecret = b64urlToBytes(auth);

  const ephemeral = await crypto.subtle.generateKey({ name: "ECDH", namedCurve: "P-256" }, true, [
    "deriveBits",
  ]);
  const serverPub = new Uint8Array(await crypto.subtle.exportKey("raw", ephemeral.publicKey));
  const clientKey = await crypto.subtle.importKey(
    "raw",
    clientPub as BufferSource,
    { name: "ECDH", namedCurve: "P-256" },
    false,
    [],
  );
  const shared = new Uint8Array(
    await crypto.subtle.deriveBits({ name: "ECDH", public: clientKey }, ephemeral.privateKey, 256),
  );

  const prkKey = await hmac(authSecret, shared);
  const keyInfo = concat(enc.encode("WebPush: info\0"), clientPub, serverPub);
  const ikm = await hkdfExpand(prkKey, keyInfo, 32);

  const salt = crypto.getRandomValues(new Uint8Array(16));
  const prk = await hmac(salt, ikm);
  const cek = await hkdfExpand(prk, enc.encode("Content-Encoding: aes128gcm\0"), 16);
  const nonce = await hkdfExpand(prk, enc.encode("Content-Encoding: nonce\0"), 12);

  const aesKey = await crypto.subtle.importKey("raw", cek as BufferSource, { name: "AES-GCM" }, false, ["encrypt"]);
  const plaintext = concat(enc.encode(payload), new Uint8Array([2]));
  const ciphertext = new Uint8Array(
    await crypto.subtle.encrypt({ name: "AES-GCM", iv: nonce as BufferSource }, aesKey, plaintext as BufferSource),
  );

  const recordSize = new Uint8Array(4);
  new DataView(recordSize.buffer).setUint32(0, 4096);
  return concat(salt, recordSize, new Uint8Array([serverPub.length]), serverPub, ciphertext);
}

export type PushSubscriptionRow = { endpoint: string; p256dh: string; auth: string };

/** Invia una notifica; ritorna 'gone' quando l'iscrizione non è più valida. */
export async function sendWebPush(
  subscription: PushSubscriptionRow,
  message: { title: string; body: string; url?: string; tag?: string },
): Promise<"sent" | "gone" | "failed" | "not-configured"> {
  if (!isPushConfigured()) return "not-configured";
  try {
    const audience = new URL(subscription.endpoint).origin;
    const { authorization } = await vapidHeader(audience);
    const body = await encryptPayload(subscription.p256dh, subscription.auth, JSON.stringify(message));
    const response = await fetch(subscription.endpoint, {
      method: "POST",
      headers: {
        Authorization: authorization,
        "Content-Encoding": "aes128gcm",
        "Content-Type": "application/octet-stream",
        TTL: "86400",
        Urgency: "high",
      },
      body: body as BodyInit,
    });
    if (response.status === 404 || response.status === 410) return "gone";
    if (!response.ok) {
      console.error(`Web push fallito [${response.status}]: ${await response.text()}`);
      return "failed";
    }
    return "sent";
  } catch (error) {
    console.error("Web push errore", error);
    return "failed";
  }
}

/** Invia a tutte le iscrizioni dell'utente, ripulendo quelle scadute. */
export async function sendPushToUser(
  userId: string,
  message: { title: string; body: string; url?: string; tag?: string },
): Promise<{ sent: number; removed: number; configured: boolean }> {
  if (!isPushConfigured()) return { sent: 0, removed: 0, configured: false };
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: subs } = await supabaseAdmin
    .from("push_subscriptions")
    .select("endpoint, p256dh, auth")
    .eq("user_id", userId);
  let sent = 0;
  let removed = 0;
  for (const sub of subs ?? []) {
    const result = await sendWebPush(sub as PushSubscriptionRow, message);
    if (result === "sent") sent += 1;
    if (result === "gone") {
      removed += 1;
      await supabaseAdmin.from("push_subscriptions").delete().eq("endpoint", sub.endpoint);
    }
  }
  return { sent, removed, configured: true };
}
