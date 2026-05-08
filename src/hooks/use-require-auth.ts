import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useDB } from "@/lib/store";
import { useAuthReady } from "./use-auth-ready";
import { supabase } from "@/integrations/supabase/client";

export function useRequireAuth() {
  const [db] = useDB();
  const nav = useNavigate();
  const { isReady, hasSession } = useAuthReady();

  useEffect(() => {
    if (!isReady) return;
    if (!hasSession) nav("/secure-auth", { replace: true });
  }, [hasSession, isReady, nav]);

  return isReady ? db.user : undefined;
}

export function useRequireAdmin() {
  const [db] = useDB();
  const nav = useNavigate();
  const { isReady, hasSession } = useAuthReady();
  const [serverAdmin, setServerAdmin] = useState<boolean | null>(null);

  useEffect(() => {
    if (!isReady) return;
    if (!hasSession) {
      nav("/secure-auth", { replace: true });
      return;
    }
    // Server-side admin verification — never trust localStorage alone.
    let mounted = true;
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) { if (mounted) setServerAdmin(false); return; }
      const { data, error } = await supabase.rpc("has_role", {
        _user_id: session.user.id,
        _role: "admin",
      });
      if (!mounted) return;
      const ok = !error && data === true;
      setServerAdmin(ok);
      if (!ok) nav("/dashboard", { replace: true });
    })();
    return () => { mounted = false; };
  }, [hasSession, isReady, nav]);

  if (!isReady || serverAdmin !== true) return undefined;
  return db.user;
}

