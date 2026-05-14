/**
 * MaintenanceGate — when operator flips `maintenance_mode` ON, every
 * non-admin user sees a fullscreen maintenance screen instead of the app.
 * Admins still see the app so they can flip it back off.
 */
import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { useKillSwitches } from "@/hooks/use-kill-switches";
import { supabase } from "@/integrations/supabase/client";
import { Wrench } from "lucide-react";

export default function MaintenanceGate({ children }: { children: ReactNode }) {
  const ks = useKillSwitches();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { if (alive) setIsAdmin(false); return; }
        const { data } = await (supabase as any).rpc("has_role", { _user_id: user.id, _role: "admin" });
        if (alive) setIsAdmin(!!data);
      } catch { if (alive) setIsAdmin(false); }
    })();
    return () => { alive = false; };
  }, []);

  if (!ks.loaded || !ks.maintenance_mode || isAdmin) return <>{children}</>;

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <div className="max-w-md text-center space-y-4">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-accent/15 text-accent">
          <Wrench className="w-8 h-8" />
        </div>
        <h1 className="text-2xl font-display font-black">점검 중입니다</h1>
        <p className="text-sm text-muted-foreground">
          서비스가 일시적으로 점검 모드입니다. 잠시 후 다시 시도해 주세요.
        </p>
        {ks.reasons.maintenance_mode && (
          <p className="text-xs text-muted-foreground border border-border/40 rounded-lg p-3">
            사유: {ks.reasons.maintenance_mode}
          </p>
        )}
      </div>
    </div>
  );
}
