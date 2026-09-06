import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { itemsQuery } from "@/lib/queries";
import { exportCsv, exportJson } from "@/lib/exporters";
import { CardtraderSettingsPanel } from "@/components/CardtraderSettingsPanel";

export const Route = createFileRoute("/_authenticated/impostazioni")({
  head: () => ({
    meta: [
      { title: "Impostazioni — Pokémon Collection Manager" },
      { name: "description", content: "Account, export dei dati e informazioni sulla collezione." },
      { property: "og:title", content: "Impostazioni — Pokémon Collection Manager" },
      { property: "og:description", content: "Gestisci account ed esporta i dati in JSON o CSV." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ImpostazioniPage,
});

function ImpostazioniPage() {
  const { data: items } = useSuspenseQuery(itemsQuery());
  const navigate = useNavigate();
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? null));
  }, []);

  const demo = items.filter((i) => i.is_demo).length;

  return (
    <AppShell title="Impostazioni" subtitle="Account ed export dati">
      <div className="grid gap-4 lg:grid-cols-2">
        <CardtraderSettingsPanel />

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Account</CardTitle>
            <CardDescription>{email ?? "Caricamento…"}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              variant="outline"
              onClick={async () => {
                await supabase.auth.signOut();
                navigate({ to: "/auth", replace: true });
              }}
            >
              Esci
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Export dati</CardTitle>
            <CardDescription>Scarica l'intera collezione.</CardDescription>
          </CardHeader>
          <CardContent className="flex gap-2">
            <Button variant="outline" onClick={() => exportJson(items)}>
              Esporta JSON
            </Button>
            <Button variant="outline" onClick={() => exportCsv(items)}>
              Esporta CSV
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Collezione</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm text-muted-foreground">
            <p>Elementi totali: {items.length}</p>
            <p>Carte: {items.filter((i) => i.item_type === "CARD").length}</p>
            <p>Sealed: {items.filter((i) => i.item_type === "SEALED").length}</p>
            <p>Elementi demo: {demo}</p>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
