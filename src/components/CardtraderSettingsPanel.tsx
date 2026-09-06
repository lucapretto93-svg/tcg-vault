import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { BellRing, PlugZap, RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  CT_CONDITIONS,
  CT_LANGUAGES,
  cardtraderSettingsQuery,
  saveCardtraderSettings,
} from "@/lib/cardtrader";
import {
  cardtraderStatus,
  runCardtraderScan,
  sendCardtraderTestAlert,
} from "@/lib/cardtrader.functions";
import { getPushConfig, savePushSubscription, sendTestPush, sendTestWhatsapp } from "@/lib/push.functions";

function toggle(list: string[], value: string): string[] {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}

function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + padding).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

export function CardtraderSettingsPanel() {
  const queryClient = useQueryClient();
  const { data: settings } = useQuery(cardtraderSettingsQuery());
  const statusFn = useServerFn(cardtraderStatus);
  const scanFn = useServerFn(runCardtraderScan);
  const testAlertFn = useServerFn(sendCardtraderTestAlert);
  const pushConfigFn = useServerFn(getPushConfig);
  const saveSubFn = useServerFn(savePushSubscription);
  const testPushFn = useServerFn(sendTestPush);
  const testWhatsappFn = useServerFn(sendTestWhatsapp);

  const status = useQuery({
    queryKey: ["cardtrader_status"],
    queryFn: () => statusFn({}),
    staleTime: 60_000,
  });

  const [form, setForm] = useState({
    radar_enabled: false,
    discount_threshold: 35,
    max_price: 100,
    allowed_conditions: ["Mint", "Near Mint", "Slightly Played"] as string[],
    languages: ["en", "it", "jp"] as string[],
    alert_deal_score: 90,
    alert_discount: 45,
    push_enabled: false,
    telegram_enabled: false,
    whatsapp_enabled: false,
  });

  useEffect(() => {
    if (!settings) return;
    setForm({
      radar_enabled: settings.radar_enabled,
      discount_threshold: Number(settings.discount_threshold),
      max_price: Number(settings.max_price),
      allowed_conditions: settings.allowed_conditions ?? [],
      languages: settings.languages ?? [],
      alert_deal_score: Number(settings.alert_deal_score),
      alert_discount: Number(settings.alert_discount),
      push_enabled: settings.push_enabled,
      telegram_enabled: settings.telegram_enabled,
      whatsapp_enabled: settings.whatsapp_enabled,
    });
  }, [settings]);

  const save = useMutation({
    mutationFn: (values: typeof form) => saveCardtraderSettings(values),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["cardtrader_settings"] });
      toast.success("Impostazioni CardTrader salvate");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const scan = useMutation({
    mutationFn: () => scanFn({}),
    onSuccess: async (result) => {
      await queryClient.invalidateQueries({ queryKey: ["cardtrader_deals"] });
      await queryClient.invalidateQueries({ queryKey: ["cardtrader_settings"] });
      if (result.status === "ok") toast.success(result.message);
      else toast.warning(result.message);
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const enablePush = useMutation({
    mutationFn: async () => {
      if (typeof window === "undefined" || !("serviceWorker" in navigator) || !("PushManager" in window)) {
        throw new Error("Notifiche push non supportate su questo browser. Su iPhone aggiungi prima l'app alla schermata Home.");
      }
      const config = await pushConfigFn({});
      if (!config.configured || !config.publicKey) {
        throw new Error("Chiavi push non ancora configurate lato server: aggiungi VAPID_PUBLIC_KEY e VAPID_PRIVATE_KEY nei Secrets.");
      }
      const permission = await Notification.requestPermission();
      if (permission !== "granted") throw new Error("Permesso notifiche negato.");
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(config.publicKey) as BufferSource,
      });
      const json = subscription.toJSON();
      await saveSubFn({
        data: {
          endpoint: json.endpoint ?? "",
          p256dh: json.keys?.["p256dh"] ?? "",
          auth: json.keys?.["auth"] ?? "",
          userAgent: navigator.userAgent,
        },
      });
      await saveCardtraderSettings({ ...form, push_enabled: true });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["cardtrader_settings"] });
      toast.success("Notifiche push attivate su questo dispositivo");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const testAlert = useMutation({
    mutationFn: () => testAlertFn({}),
    onSuccess: (result) =>
      result.sent
        ? toast.success("Messaggio Telegram inviato")
        : toast.warning("Telegram non configurato: aggiungi TELEGRAM_BOT_TOKEN e TELEGRAM_CHAT_ID nei Secrets."),
    onError: (error: Error) => toast.error(error.message),
  });

  const testPush = useMutation({
    mutationFn: () => testPushFn({}),
    onSuccess: (result) => {
      if (!result.configured) return toast.warning("Chiavi push non configurate lato server.");
      if (result.sent > 0) return toast.success(`Notifica di prova inviata a ${result.sent} dispositivo/i`);
      toast.warning("Nessun dispositivo registrato: premi prima \"Attiva push su questo dispositivo\".");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const testWhatsapp = useMutation({
    mutationFn: () => testWhatsappFn({}),
    onSuccess: (result) => {
      if (!result.configured)
        return toast.warning(
          "WhatsApp non configurato: servono i dati del provider Twilio (numero mittente e numero destinatario).",
        );
      return result.ok
        ? toast.success("Messaggio WhatsApp inviato")
        : toast.error(result.error ?? "Invio WhatsApp fallito");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const connected = status.data?.connected;

  return (
    <Card className="lg:col-span-2">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <PlugZap className="h-4 w-4" /> CardTrader
          {status.isLoading ? (
            <Badge variant="outline">Verifica…</Badge>
          ) : connected ? (
            <Badge>Connesso</Badge>
          ) : (
            <Badge variant="destructive">Configura CardTrader</Badge>
          )}
        </CardTitle>
        <CardDescription>
          {connected
            ? `Account: ${status.data?.account}`
            : (status.data?.error ??
              "Aggiungi il token CardTrader nei Secrets del progetto (CARDTRADER_API_TOKEN). Il token resta solo lato server.")}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              void status.refetch();
              toast.info("Test connessione in corso…");
            }}
          >
            <RefreshCw className="mr-1 h-4 w-4" /> Test connessione
          </Button>
          <Button size="sm" variant="outline" disabled={scan.isPending} onClick={() => scan.mutate()}>
            Scansiona ora
          </Button>
        </div>

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={form.radar_enabled}
            onChange={(e) => setForm({ ...form, radar_enabled: e.target.checked })}
          />
          Radar occasioni attivo (scansione oraria automatica)
        </label>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-xs text-muted-foreground">
            Soglia sconto minima (%)
            <Input
              inputMode="decimal"
              value={form.discount_threshold}
              onChange={(e) => setForm({ ...form, discount_threshold: Number(e.target.value) })}
            />
          </label>
          <label className="text-xs text-muted-foreground">
            Prezzo massimo per affare (€)
            <Input
              inputMode="decimal"
              value={form.max_price}
              onChange={(e) => setForm({ ...form, max_price: Number(e.target.value) })}
            />
          </label>
          <label className="text-xs text-muted-foreground">
            Deal Score per alert immediato
            <Input
              inputMode="decimal"
              value={form.alert_deal_score}
              onChange={(e) => setForm({ ...form, alert_deal_score: Number(e.target.value) })}
            />
          </label>
          <label className="text-xs text-muted-foreground">
            Sconto per alert immediato (%)
            <Input
              inputMode="decimal"
              value={form.alert_discount}
              onChange={(e) => setForm({ ...form, alert_discount: Number(e.target.value) })}
            />
          </label>
        </div>

        <div>
          <p className="mb-1 text-xs text-muted-foreground">Condizioni ammesse</p>
          <div className="flex flex-wrap gap-2">
            {CT_CONDITIONS.map((condition) => (
              <button
                key={condition}
                type="button"
                onClick={() =>
                  setForm({ ...form, allowed_conditions: toggle(form.allowed_conditions, condition) })
                }
                className={`rounded-full border px-3 py-1 text-xs ${
                  form.allowed_conditions.includes(condition)
                    ? "border-primary bg-primary/15 text-primary"
                    : "border-border text-muted-foreground"
                }`}
              >
                {condition}
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="mb-1 text-xs text-muted-foreground">Lingue</p>
          <div className="flex flex-wrap gap-2">
            {CT_LANGUAGES.map((language) => (
              <button
                key={language}
                type="button"
                onClick={() => setForm({ ...form, languages: toggle(form.languages, language) })}
                className={`rounded-full border px-3 py-1 text-xs uppercase ${
                  form.languages.includes(language)
                    ? "border-primary bg-primary/15 text-primary"
                    : "border-border text-muted-foreground"
                }`}
              >
                {language}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2 rounded-lg border border-border p-3">
          <p className="flex items-center gap-2 text-sm font-medium">
            <BellRing className="h-4 w-4" /> Notifiche
          </p>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" disabled={enablePush.isPending} onClick={() => enablePush.mutate()}>
              {form.push_enabled ? "Riattiva push su questo dispositivo" : "Attiva push (iPhone: da app installata)"}
            </Button>
            <Button size="sm" variant="outline" disabled={testPush.isPending} onClick={() => testPush.mutate()}>
              Invia notifica di prova
            </Button>
            <Button size="sm" variant="outline" disabled={testWhatsapp.isPending} onClick={() => testWhatsapp.mutate()}>
              Test WhatsApp
            </Button>
            <Button size="sm" variant="outline" disabled={testAlert.isPending} onClick={() => testAlert.mutate()}>
              Test Telegram
            </Button>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.telegram_enabled}
              onChange={(e) => setForm({ ...form, telegram_enabled: e.target.checked })}
            />
            Alert Telegram per affari eccezionali
            {status.data?.telegramConfigured ? null : (
              <span className="text-xs text-muted-foreground">(secrets non configurati)</span>
            )}
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.whatsapp_enabled}
              onChange={(e) => setForm({ ...form, whatsapp_enabled: e.target.checked })}
            />
            Alert WhatsApp per affari eccezionali
            {status.data?.whatsappConfigured ? null : (
              <span className="text-xs text-muted-foreground">(provider non ancora configurato)</span>
            )}
          </label>
          <p className="text-xs text-muted-foreground">
            Push: {status.data?.pushConfigured ? "attive lato server" : "chiavi server non configurate"}. Su iPhone
            aggiungi prima TCG Vault alla schermata Home (Safari → Condividi → Aggiungi a Home) e apri l'app da lì.
          </p>
        </div>

        <Button disabled={save.isPending} onClick={() => save.mutate(form)}>
          Salva impostazioni CardTrader
        </Button>
      </CardContent>
    </Card>
  );
}
