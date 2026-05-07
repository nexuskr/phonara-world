import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export function useAuthReady() {
  const [isReady, setIsReady] = useState(false);
  const [hasSession, setHasSession] = useState(false);

  useEffect(() => {
    let active = true;

    const { data: subscription } = supabase.auth.onAuthStateChange((event, session) => {
      if (!active) return;
      // Clear stale state on token errors
      if (event === "TOKEN_REFRESHED" && !session) {
        setHasSession(false);
        setIsReady(true);
        return;
      }
      setHasSession(!!session?.user);
      setIsReady(true);
    });

    supabase.auth.getSession()
      .then(({ data, error }) => {
        if (!active) return;
        if (error) {
          // Invalid refresh token → wipe and continue
          supabase.auth.signOut().catch(() => {});
          setHasSession(false);
        } else {
          setHasSession(!!data.session?.user);
        }
        setIsReady(true);
      })
      .catch(() => {
        if (!active) return;
        setHasSession(false);
        setIsReady(true);
      });

    return () => {
      active = false;
      subscription.subscription.unsubscribe();
    };
  }, []);

  return { isReady, hasSession };
}
