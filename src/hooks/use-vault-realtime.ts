import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const REFRESH_DELAY_MS = 250;

/**
 * Keeps active Vault queries synchronized with database writes made by the app
 * or by external tools. Related inserts are debounced into a single refetch.
 */
export function useVaultRealtime() {
  const queryClient = useQueryClient();

  useEffect(() => {
    let refreshTimer: ReturnType<typeof setTimeout> | undefined;

    const refresh = () => {
      if (refreshTimer) clearTimeout(refreshTimer);
      refreshTimer = setTimeout(() => {
        void queryClient.invalidateQueries();
      }, REFRESH_DELAY_MS);
    };

    const channel = supabase
      .channel("vault-database-changes")
      .on("postgres_changes", { event: "*", schema: "public" }, refresh)
      .subscribe();

    const refreshWhenVisible = () => {
      if (document.visibilityState === "visible") refresh();
    };

    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refreshWhenVisible);

    return () => {
      if (refreshTimer) clearTimeout(refreshTimer);
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refreshWhenVisible);
      void supabase.removeChannel(channel);
    };
  }, [queryClient]);
}
