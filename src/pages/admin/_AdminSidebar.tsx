import { memo } from "react";
import { NavLink, useLocation } from "react-router-dom";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem, useSidebar,
} from "@/components/ui/sidebar";
import { Crown, ShieldCheck } from "lucide-react";
import { ADMIN_NAV, type AdminBadgeSource } from "./_nav";
import { cn } from "@/lib/utils";

type PendingMap = Partial<Record<AdminBadgeSource, number>>;

interface AdminSidebarProps {
  /** Realtime pending counts; supplied by AdminLayout. */
  pending?: PendingMap;
}

function PendingDot({ count }: { count?: number }) {
  if (!count || count <= 0) return null;
  const hot = count >= 5;
  return (
    <span
      className={cn(
        "ml-auto inline-flex min-w-[20px] h-[18px] items-center justify-center rounded-full px-1.5 text-[10px] font-black tabular-nums",
        hot
          ? "bg-destructive text-destructive-foreground animate-pulse"
          : "bg-gold/90 text-gold-foreground",
      )}
      aria-label={`${count} pending`}
    >
      {count > 99 ? "99+" : count}
    </span>
  );
}

function AdminSidebarBase({ pending = {} }: AdminSidebarProps) {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const { pathname } = useLocation();

  const isExact = (to: string) =>
    to === "/admin" ? pathname === "/admin" : pathname === to || pathname.startsWith(to + "/");

  return (
    <Sidebar collapsible="icon" className="border-r border-border/40">
      <SidebarHeader className="border-b border-border/40 px-3 py-3">
        <div className="flex items-center gap-2">
          <Crown className="w-5 h-5 text-gold shrink-0" />
          {!collapsed && (
            <div className="leading-tight">
              <div className="font-imperial text-sm tracking-[0.18em] text-gradient-imperial">
                PHONARA
              </div>
              <div className="text-[9px] tracking-[0.3em] text-muted-foreground font-bold">
                MISSION CONTROL
              </div>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent>
        {ADMIN_NAV.map((section) => {
          return (
            <SidebarGroup key={section.id}>
              <SidebarGroupLabel
                className={cn(
                  "text-[9px] tracking-[0.3em] font-black uppercase",
                  section.aal2 ? "text-destructive/80" : "text-muted-foreground",
                )}
              >
                <span className="mr-1">{section.emoji}</span>
                {section.label}
                {section.aal2 && (
                  <ShieldCheck
                    className="w-3 h-3 ml-1 inline opacity-70"
                    aria-label="AAL2 required"
                  />
                )}
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {section.items.map((item) => {
                    const active = isExact(item.to);
                    const count = item.badge ? pending[item.badge] : undefined;
                    const Icon = item.icon;
                    return (
                      <SidebarMenuItem key={item.id}>
                        <SidebarMenuButton asChild isActive={active} tooltip={item.name}>
                          <NavLink
                            to={item.to}
                            end={item.to === "/admin"}
                            className="flex items-center gap-2"
                          >
                            <Icon className="w-4 h-4 shrink-0" />
                            {!collapsed && (
                              <>
                                <span className="truncate">{item.name}</span>
                                <PendingDot count={count} />
                              </>
                            )}
                            {collapsed && count && count > 0 ? (
                              <span
                                className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-destructive animate-pulse"
                                aria-label={`${count} pending`}
                              />
                            ) : null}
                          </NavLink>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          );
        })}
      </SidebarContent>
    </Sidebar>
  );
}

const AdminSidebar = memo(AdminSidebarBase);
export default AdminSidebar;
