import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Layers,
  LibraryBig,
  Package,
  ShoppingCart,
  Receipt,
  Award,
  LineChart,
  Target,
  Rocket,
  Radar,
  Settings,
  Menu,
  LogOut,
  MoreHorizontal,
} from "lucide-react";
import { useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useVaultRealtime } from "@/hooks/use-vault-realtime";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import { StatusLights, VaultLogo } from "@/components/VaultLogo";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/da-muovere", label: "Da muovere", icon: Rocket },
  { to: "/occasioni", label: "Occasioni", icon: Radar },
  { to: "/collezione", label: "Collezione", icon: LibraryBig },
  { to: "/carte", label: "Inventario", icon: Layers },
  { to: "/sealed", label: "Sealed", icon: Package },
  { to: "/acquisti", label: "Acquisti", icon: ShoppingCart },
  { to: "/vendite", label: "Vendite", icon: Receipt },
  { to: "/set-progress", label: "Set Progress", icon: Target },
  { to: "/grading", label: "Grading", icon: Award },
  { to: "/prezzi", label: "Storico Prezzi", icon: LineChart },
  { to: "/impostazioni", label: "Impostazioni", icon: Settings },
] as const;

const MOBILE_NAV = [
  { to: "/dashboard", label: "Home", icon: LayoutDashboard, featured: false },
  { to: "/collezione", label: "Collezione", icon: LibraryBig, featured: false },
  { to: "/da-muovere", label: "Muovi", icon: Rocket, featured: true },
  { to: "/occasioni", label: "Occasioni", icon: Radar, featured: false },
] as const;

function NavList({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <nav aria-label="Navigazione principale" className="flex flex-col gap-1 p-3">
      {NAV.map(({ to, label, icon: Icon }) => {
        const active = pathname === to || pathname.startsWith(`${to}/`);
        return (
          <Link
            key={to}
            to={to}
            onClick={onNavigate}
            className={cn(
              "flex min-h-11 items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
              active
                ? "poke-nav-active bg-sidebar-accent"
                : "text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground",
            )}
          >
            <Icon className="h-4 w-4 shrink-0" />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

function Brand() {
  return (
    <div className="pokedex-brand border-b border-sidebar-border px-4 py-4">
      <VaultLogo />
      <StatusLights />
    </div>
  );
}

function MobileDock({ onMore }: { onMore: () => void }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <nav className="mobile-dock lg:hidden" aria-label="Navigazione rapida">
      <div className="mobile-dock-inner">
        {MOBILE_NAV.map(({ to, label, icon: Icon, featured }) => {
          const active = pathname === to || pathname.startsWith(`${to}/`);
          return (
            <Link
              key={to}
              to={to}
              aria-current={active ? "page" : undefined}
              className={cn("mobile-dock-item", active && "is-active", featured && "is-featured")}
            >
              <span className="mobile-dock-icon"><Icon /></span>
              <span>{label}</span>
            </Link>
          );
        })}
        <Button
          type="button"
          variant="ghost"
          className="mobile-dock-item h-auto rounded-none px-0 py-0"
          onClick={onMore}
          aria-label="Apri tutte le sezioni"
        >
          <span className="mobile-dock-icon"><MoreHorizontal /></span>
          <span>Altro</span>
        </Button>
      </div>
    </nav>
  );
}

export function AppShell({
  title,
  subtitle,
  actions,
  children,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  useVaultRealtime();

  const signOut = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/auth" });
  };

  return (
    <div className="app-viewport flex min-h-screen bg-background">
      <aside className="pokedex-sidebar hidden w-64 shrink-0 flex-col border-r border-sidebar-border bg-sidebar lg:flex">
        <Brand />
        <div className="flex-1 overflow-y-auto">
          <NavList />
        </div>
        <div className="border-t border-sidebar-border p-3">
          <Button variant="ghost" className="w-full justify-start gap-3" onClick={signOut}>
            <LogOut className="h-4 w-4" /> Esci
          </Button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="app-header pokedex-header sticky top-0 z-20 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-b border-border bg-background/85 px-4 py-3 backdrop-blur md:px-6">
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                className="hidden min-h-11 min-w-11 lg:flex"
                aria-label="Apri navigazione"
              >
                <Menu className="h-4 w-4" />
              </Button>
            </SheetTrigger>
            <SheetContent
              side="left"
              className="mobile-sheet pokedex-sidebar flex w-72 flex-col bg-sidebar p-0"
            >
              <SheetTitle className="sr-only">Navigazione</SheetTitle>
              <Brand />
              <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain [-webkit-overflow-scrolling:touch]">
                <NavList onNavigate={() => setOpen(false)} />
              </div>
              <div className="border-t border-sidebar-border p-3">
                <Button variant="ghost" className="w-full justify-start gap-3" onClick={signOut}>
                  <LogOut className="h-4 w-4" /> Esci
                </Button>
              </div>
            </SheetContent>
          </Sheet>

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="block lg:hidden">
                <VaultLogo compact />
              </span>
              <h1 className="poke-title truncate text-lg font-extrabold tracking-tight md:text-xl">{title}</h1>
            </div>
            {subtitle ? <p className="truncate text-xs text-muted-foreground">{subtitle}</p> : null}
          </div>
          <div className="flex shrink-0 items-center gap-2">{actions}</div>
        </header>

        <main className="app-content poke-main flex-1 p-4 md:p-6">{children}</main>
        <MobileDock onMore={() => setOpen(true)} />
      </div>
    </div>
  );
}
