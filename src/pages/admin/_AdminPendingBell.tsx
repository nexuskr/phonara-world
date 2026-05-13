import { memo } from "react";
import { Bell } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { NavLink } from "react-router-dom";
import { ADMIN_NAV_FLAT } from "@/pages/admin/_nav";
import type { PendingCounts } from "@/hooks/use-admin-pending";
import { cn } from "@/lib/utils";

interface Props {
  pending: PendingCounts;
}

function AdminPendingBellBase({ pending }: Props) {
  const total = Object.values(pending).reduce<number>((a, b) => a + (b ?? 0), 0);
  const hot = total >= 5;

  const items = ADMIN_NAV_FLAT
    .filter((i) => i.badge && (pending[i.badge] ?? 0) > 0)
    .map((i) => ({ ...i, count: pending[i.badge!]! }))
    .sort((a, b) => b.count - a.count);

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
      <PopoverContent align="end" className="w-72 p-2">
        <div className="text-[10px] tracking-[0.3em] text-muted-foreground font-black uppercase px-2 py-1.5">
          Pending Queues
        </div>
        {items.length === 0 ? (
          <div className="px-3 py-6 text-center text-xs text-muted-foreground">
            All clear. No pending items. ✨
          </div>
        ) : (
          <div className="space-y-0.5">
            {items.map((i) => {
              const Icon = i.icon;
              return (
                <NavLink
                  key={i.id}
                  to={i.to}
                  className="flex items-center gap-2 px-2 py-2 rounded-md text-xs hover:bg-muted/60 transition"
                >
                  <Icon className="w-3.5 h-3.5 text-muted-foreground" />
                  <span className="flex-1 truncate">
                    <span className="text-muted-foreground/80 mr-1">{i.sectionLabel}</span>
                    {i.name}
                  </span>
                  <span
                    className={cn(
                      "min-w-[20px] text-center px-1.5 rounded-full text-[10px] font-black tabular-nums",
                      i.count >= 5
                        ? "bg-destructive text-destructive-foreground"
                        : "bg-gold/90 text-gold-foreground",
                    )}
                  >
                    {i.count}
                  </span>
                </NavLink>
              );
            })}
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}

export default memo(AdminPendingBellBase);
