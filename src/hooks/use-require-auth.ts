import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useDB } from "@/lib/store";
import { useAuthReady } from "./use-auth-ready";

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

  useEffect(() => {
    if (!isReady) return;
    if (!hasSession) nav("/secure-auth", { replace: true });
    else if (db.user && !db.user.isAdmin) nav("/dashboard", { replace: true });
  }, [db.user, hasSession, isReady, nav]);

  return isReady ? db.user : undefined;
}
