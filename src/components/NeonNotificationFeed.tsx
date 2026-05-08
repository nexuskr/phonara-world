import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const NEON_KIND_STYLE: Record<string, { color: string; emoji: string }> = {
  ai_mission_new:      { color: "from-cyan-400 to-blue-500",   emoji: "🤖" },
  ai_mission_approved: { color: "from-emerald-400 to-teal-500", emoji: "✅" },
  mission_reward:      { color: "from-amber-400 to-orange-500", emoji: "🎁" },
  weekly_payout:       { color: "from-amber-400 to-rose-500",   emoji: "🏆" },
  weekly_pass_claim:   { color: "from-violet-400 to-fuchsia-500", emoji: "🌟" },
  rank_up:             { color: "from-yellow-300 to-amber-500", emoji: "📈" },
  rank_change:         { color: "from-yellow-300 to-rose-500",  emoji: "🎯" },
  weekly_pass_end:     { color: "from-violet-400 to-rose-500",  emoji: "⏰" },
  achievement:         { color: "from-pink-400 to-rose-500",    emoji: "🏅" },
};

interface NotificationRow {
  id: string;
  user_id: string;
  kind: string;
  title: string;
  body: string | null;
  payload: any;
  created_at: string;
}

export default function NeonNotificationFeed() {
  const seen = useRef<Set<string>>(new Set());

  useEffect(() => {
    let channel: any;
    let mounted = true;

    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !mounted) return;

      // Mark recent ones as seen so we don't replay history on every mount
      const { data: recent } = await supabase
        .from("notifications")
        .select("id")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(50);
      (recent ?? []).forEach((r: any) => seen.current.add(r.id));

      channel = supabase
        .channel(`notif:${user.id}`)
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` },
          (payload) => {
            const n = payload.new as NotificationRow;
            if (seen.current.has(n.id)) return;
            seen.current.add(n.id);
            const style = NEON_KIND_STYLE[n.kind] ?? { color: "from-primary to-purple-500", emoji: "🔔" };
            toast.custom(
              () => (
                <div
                  className="relative overflow-hidden rounded-2xl p-4 min-w-[260px] max-w-sm bg-background/95 backdrop-blur shadow-[0_0_40px_-10px] shadow-primary/40 border border-primary/40"
                  style={{ filter: "drop-shadow(0 0 12px hsl(var(--primary) / 0.4))" }}
                >
                  <div className={`absolute inset-0 bg-gradient-to-r ${style.color} opacity-[0.15] pointer-events-none`} />
                  <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/60 to-transparent" />
                  <div className="relative flex items-start gap-3">
                    <span className="text-2xl">{style.emoji}</span>
                    <div className="min-w-0 flex-1">
                      <div className="font-bold text-sm tracking-tight">{n.title}</div>
                      {n.body && <div className="text-xs text-muted-foreground mt-0.5 break-keep">{n.body}</div>}
                    </div>
                  </div>
                </div>
              ),
              { duration: 6000, position: "top-right" },
            );
          },
        )
        .subscribe();
    })();

    return () => {
      mounted = false;
      if (channel) supabase.removeChannel(channel);
    };
  }, []);

  return null;
}
