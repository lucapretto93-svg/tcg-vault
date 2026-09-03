import { cn } from "@/lib/utils";

export function VaultLogo({
  className,
  compact = false,
}: {
  className?: string;
  compact?: boolean;
}) {
  return (
    <div className={cn("flex items-center gap-3", className)} aria-label="TCG Vault">
      <div className="vault-logo-mark" aria-hidden="true">
        <svg viewBox="0 0 48 48" role="img">
          <path d="M9 7h30a4 4 0 0 1 4 4v26a4 4 0 0 1-4 4H9a4 4 0 0 1-4-4V11a4 4 0 0 1 4-4Z" />
          <path className="vault-logo-card" d="M17 15h18v22H17z" />
          <path className="vault-logo-v" d="m20 20 4 11 4-11" />
          <circle className="vault-logo-lens" cx="13" cy="14" r="4" />
          <circle className="vault-logo-glint" cx="12" cy="13" r="1.25" />
        </svg>
      </div>
      {!compact ? (
        <div className="min-w-0 leading-none">
          <p className="vault-wordmark">TCG VAULT</p>
          <p className="mt-1.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            Collection system
          </p>
        </div>
      ) : null}
    </div>
  );
}

export function StatusLights() {
  return (
    <div className="flex items-center gap-1.5" aria-hidden="true">
      <span className="h-2 w-2 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,.8)]" />
      <span className="h-2 w-2 rounded-full bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,.55)]" />
      <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,.55)]" />
    </div>
  );
}
