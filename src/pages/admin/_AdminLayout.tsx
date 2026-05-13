import { Outlet, useLocation } from "react-router-dom";
import { SidebarProvider, SidebarTrigger, SidebarInset } from "@/components/ui/sidebar";
import { useRequireAdmin } from "@/hooks/use-require-auth";
import { useAdminPending } from "@/hooks/use-admin-pending";
import AdminSidebar from "./_AdminSidebar";
import AdminPendingBell from "./_AdminPendingBell";
import AdminAal2Chip from "./_AdminAal2Chip";
import AdminCommandTrigger from "./_AdminCommandTrigger";
import AdminAal2Gate from "@/components/admin/AdminAal2Gate";
import { isAal2Path, ADMIN_NAV_FLAT } from "./_nav";
import { Crown } from "lucide-react";

/**
 * Admin shell — Sidebar + sticky header + AAL2-route gating.
 * All /admin/* routes nest under this layout via <Outlet />.
 */
export default function AdminLayout() {
  const user = useRequireAdmin();
  const { pathname } = useLocation();
  const pending = useAdminPending(!!user?.isAdmin);

  if (!user) return null;

  // Active item label for breadcrumb-ish header.
  const active =
    ADMIN_NAV_FLAT.find((i) =>
      i.to === "/admin" ? pathname === "/admin" : pathname === i.to || pathname.startsWith(i.to + "/"),
    );
  const requiresAal2 = isAal2Path(pathname);

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AdminSidebar pending={pending} />

        <SidebarInset className="flex flex-col min-w-0">
          {/* Sticky header */}
          <header className="sticky top-0 z-30 h-14 border-b border-border/40 bg-background/85 backdrop-blur flex items-center gap-2 px-3 sm:px-4">
            <SidebarTrigger className="shrink-0" />
            <div className="hidden sm:flex items-center gap-1.5 min-w-0">
              <Crown className="w-4 h-4 text-gold shrink-0" />
              <span className="text-[10px] tracking-[0.3em] text-muted-foreground font-black uppercase truncate">
                {active ? `${active.sectionLabel} · ` : ""}
                <span className="text-foreground">{active?.name ?? "Admin"}</span>
              </span>
            </div>
            <div className="flex-1" />
            <AdminCommandTrigger />
            <AdminAal2Chip />
            <AdminPendingBell pending={pending} />
          </header>

          {/* Body */}
          <main className="flex-1 overflow-y-auto">
            <div className="container max-w-screen-2xl py-5">
              {requiresAal2 ? (
                <AdminAal2Gate>
                  <Outlet />
                </AdminAal2Gate>
              ) : (
                <Outlet />
              )}
            </div>
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
