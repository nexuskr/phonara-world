import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useDB } from "@/lib/store";

export function useRequireAuth() {
  const [db] = useDB();
  const nav = useNavigate();
  useEffect(() => {
    if (!db.user) nav("/secure-auth", { replace: true });
  }, [db.user, nav]);
  return db.user;
}

export function useRequireAdmin() {
  const [db] = useDB();
  const nav = useNavigate();
  useEffect(() => {
    if (!db.user) nav("/secure-auth", { replace: true });
    else if (!db.user.isAdmin) nav("/dashboard", { replace: true });
  }, [db.user, nav]);
  return db.user;
}
