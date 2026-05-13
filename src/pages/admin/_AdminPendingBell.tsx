import { memo } from "react";
import { Bell, BellOff, Volume2 } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { NavLink } from "@/components/NavLink";
import { ADMIN_NAV_FLAT } from "@/pages/admin/_nav";
import type { PendingCounts } from "@/hooks/use-admin-pending";
import { useAdminSiren } from "@/hooks/use-admin-siren";
import { cn } from "@/lib/utils";

interface Props {
  pending: PendingCounts;
}

function AdminPendingBellBase({ pending }: Props) {
  const total = Object.values(pending).reduce<number>((a, b) => a + (b ?? 0), 0);
  const hot = total >= 5;
  const { muted, setMuted, lastFiredAt, testBeep } = useAdminSiren(true);

  const items = ADMIN_NAV_FLAT
    .filter((i) => i.badge && (pending[i.badge] ?? 0) > 0)
    .map((i) => ({ ...i, count: pending[i.badge!]! }))
    .sort((a, b) => b.count - a.count);

  // Group by section for visual scan
  const groups = items.reduce<Record<string, typeof items>>((acc, it) => {
    (acc[it.sectionLabel] ??= []).push(it);
    return acc;
  }, {});

  return (
    <Popover>
      <PopoverTrigger
        className={cn(
          "relative h-9 w-9 rounded-lg border border-border/60 bg-background/40 grid place-items-center transition hover:border-primary/60",
          hot && "border-destructive/60",
        )}
        aria-label={`Pending ${total}`}
      >
        <Bell className={cn("w-4 h-4", hot ? "text-destructive" : "text-muted-foreground")} />
        {total > 0 && (
          <span
            className={cn(
              "absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-black grid place-items-center tabular-nums",
              hot ? "bg-destructive text-destructive-foreground animate-pulse" : "bg-gold text-gold-foreground",
            )}
          >
            {total > 99 ? "99+" : total}
          </span>
        )}
      </PopoverTrigger>

      <PopoverContent align="end" className="w-80 p-0 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between gap-2 px-3 py-2 border-b border-border/40">
          <div className="text-[10px] tracking-[0.3em] text-muted-foreground font-black uppercase">
            Pending Queues
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={testBeep}
              className="h-6 w-6 grid place-items-center rounded hover:bg-muted/60 text-muted-foreground"
              aria-label="Test siren"
              title="사이렌 테스트"
            >
              <Volume2 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setMuted(!muted)}
              className={cn(
                "h-6 px-1.5 rounded text-[9px] font-black tracking-[0.15em] uppercase flex items-center gap-1",
                muted
                  ? "bg-destructive/15 text-destructive"
                  : "bg-secondary/15 text-secondary",
              )}
              aria-pressed={muted}
              title={muted ? "사이렌 해제" : "사이렌 음소거"}
            >
              {muted ? <BellOff className="w-3 h-3" /> : <Bell className="w-3 h-3" />}
              {muted ? "MUTED" : "LIVE"}
            </button>
          </div>
        </div>

        {/* Body */}
        {items.length === 0 ? (
          <div className="px-3 py-8 text-center text-xs text-muted-foreground">
            All clear. No pending items. ✨
          </div>
        ) : (
          <div className="max-h-[60vh] overflow-y-auto p-2 space-y-3">
            {Object.entries(groups).map(([section, list]) => (
              <div key={section}>
                <div className="px-2 pb-1 text-[9px] tracking-[0.3em] font-black text-muted-foreground/80 uppercase">
                  {section}
                </div>
                <div className="space-y-0.5">
                  {list.map((i) => {
                    const Icon = i.icon;
                    const isCritical = i.count >= 5;
                    return (
                      <NavLink
                        key={i.id}
                        to={i.to}
                        className="flex items-center gap-2 px-2 py-2 rounded-md text-xs hover:bg-muted/60 transition"
                      >
                        <Icon className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                        <span className="flex-1 truncate">{i.name}</span>
                        {i.aal2 && (
                          <span className="text-[8px] tracking-[0.2em] font-black text-destructive/70">
                            AAL2
                          </span>
                        )}
                        <span
                          className={cn(
                            "min-w-[20px] text-center px-1.5 rounded-full text-[10px] font-black tabular-nums",
                            isCritical
                              ? "bg-destructive text-destructive-foreground animate-pulse"
                              : "bg-gold/90 text-gold-foreground",
                          )}
                        >
                          {i.count}
                        </span>
                      </NavLink>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Footer */}
        <div className="px-3 py-1.5 border-t border-border/40 text-[10px] text-muted-foreground flex items-center justify-between">
          <span>Realtime · 800ms debounce</span>
          {lastFiredAt && (
            <span className="text-destructive/80 font-bold">
              🚨 last alarm {new Date(lastFiredAt).toLocaleTimeString()}
            </span>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

export default memo(AdminPendingBellBase);
