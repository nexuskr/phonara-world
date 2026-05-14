import { lazy, Suspense, useEffect, useMemo, useState } from "react";
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
import { schedulePrefetch } from "@/lib/route-prefetch";
import { Crown, KeyRound } from "lucide-react";
import PinResetDialog from "@/components/PinResetDialog";

const GodModePanel = lazy(() => import("@/components/admin/GodModePanel"));

/**
 * Admin shell — Sidebar + sticky header + AAL2-route gating.
 * All /admin/* routes nest under this layout via <Outlet />.
 */
export default function AdminLayout() {
  const user = useRequireAdmin();
  const { pathname } = useLocation();
  const pending = useAdminPending(!!user?.isAdmin);
  const [pinDialog, setPinDialog] = useState(false);
  const [adminEmail, setAdminEmail] = useState<string>("");

  useEffect(() => {
    let alive = true;
    import("@/integrations/supabase/client").then(({ supabase }) =>
      supabase.auth.getSession().then(({ data }) => {
        if (alive) setAdminEmail(data.session?.user?.email ?? "");
      }),
    );
    return () => { alive = false; };
  }, []);

  // Active item label for breadcrumb-ish header.
  const active =
    ADMIN_NAV_FLAT.find((i) =>
      i.to === "/admin" ? pathname === "/admin" : pathname === i.to || pathname.startsWith(i.to + "/"),
    );
  const requiresAal2 = isAal2Path(pathname);

  const totalPending = useMemo(
    () => Object.values(pending).reduce((a, b) => a + (b ?? 0), 0),
    [pending],
  );
  const activePending = active?.badge ? pending[active.badge] ?? 0 : 0;

  // Tab title reflects total pending so admins notice while on other tabs.
  useEffect(() => {
    const base = active ? `${active.name} · Phonara Admin` : "Phonara Admin";
    document.title = totalPending > 0 ? `(${totalPending}) ${base}` : base;
    return () => {
      document.title = "Phonara";
    };
  }, [active, totalPending]);

  // Idle-prefetch the hottest admin queues once after entering Mission Control.
  useEffect(() => {
    schedulePrefetch([
      "/admin/treasury/deposits",
      "/admin/treasury/withdrawals",
      "/admin/compliance/aml",
      "/admin/ops/errors",
    ]);
  }, []);

  // Hooks above must run on every render — gate render output AFTER hooks.
  if (!user) return null;

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
              {activePending > 0 && (
                <span className="ml-1 inline-flex items-center justify-center min-w-[20px] h-[18px] px-1.5 rounded-full bg-destructive text-destructive-foreground text-[10px] font-black tabular-nums animate-pulse">
                  {activePending > 99 ? "99+" : activePending}
                </span>
              )}
            </div>
            <div className="flex-1" />
            <AdminCommandTrigger />
            <button
              onClick={() => setPinDialog(true)}
              title="출금 PIN(6자리) 재설정"
              className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg glass border border-border text-[10px] font-bold text-muted-foreground hover:text-foreground"
            >
              <KeyRound className="w-3 h-3" /> PIN 재설정
            </button>
            <AdminAal2Chip />
            <AdminPendingBell pending={pending} />
          </header>

          {pinDialog && adminEmail && (
            <PinResetDialog email={adminEmail} onClose={() => setPinDialog(false)} />
          )}

          {/* Body */}
          <main className="flex-1 overflow-y-auto">
            <div className="container max-w-screen-2xl py-5 lg:pr-[340px]">
              {requiresAal2 ? (
                <AdminAal2Gate>
                  <Outlet />
                </AdminAal2Gate>
              ) : (
                <Outlet />
              )}
            </div>
          </main>

          {/* God Mode Panel — desktop fixed right, mobile floating drawer */}
          <Suspense fallback={null}>
            <GodModePanel />
          </Suspense>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
