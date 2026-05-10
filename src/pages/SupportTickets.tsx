// 사용자 티켓 상태 페이지: 본인 스레드의 상태/우선순위/마지막 메시지를 실시간으로 보여줍니다.
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Layout from "@/components/Layout";
import { supabase } from "@/integrations/supabase/client";
import { useRequireAuth } from "@/hooks/use-require-auth";
import { LoadingList } from "@/components/ui/loading-state";
import { EmptyState } from "@/components/ui/empty-state";
import { MessageSquare, Clock, CheckCircle2, AlertTriangle, PauseCircle, ChevronRight } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ko } from "date-fns/locale";

type Thread = {
  id: string;
  status: "open" | "reviewing" | "resolved" | "onhold";
  priority: "low" | "normal" | "high" | "urgent";
  last_message: string | null;
  last_message_at: string;
  ai_escalated: boolean;
  ai_last_category: string | null;
  unread_user: number;
  created_at: string;
};

const STATUS_META: Record<Thread["status"], { label: string; icon: any; tone: string }> = {
  open: { label: "접수", icon: MessageSquare, tone: "text-primary border-primary/40" },
  reviewing: { label: "검토 중", icon: Clock, tone: "text-secondary border-secondary/40" },
  resolved: { label: "해결됨", icon: CheckCircle2, tone: "text-emerald-400 border-emerald-400/40" },
  onhold: { label: "보류", icon: PauseCircle, tone: "text-muted-foreground border-border" },
};
const PRIORITY_TONE: Record<Thread["priority"], string> = {
  low: "bg-muted/30 text-muted-foreground",
  normal: "bg-primary/15 text-primary",
  high: "bg-orange-500/15 text-orange-400",
  urgent: "bg-destructive/15 text-destructive",
};

export default function SupportTickets() {
  const user = useRequireAuth();
  const nav = useNavigate();
  const [threads, setThreads] = useState<Thread[] | null>(null);

  useEffect(() => {
    if (!user) return;
    let channel: any;
    (async () => {
      const { data: { user: u } } = await supabase.auth.getUser();
      if (!u) return;
      const { data } = await supabase
        .from("support_threads")
        .select("id,status,priority,last_message,last_message_at,ai_escalated,ai_last_category,unread_user,created_at")
        .eq("user_id", u.id)
        .order("last_message_at", { ascending: false });
      setThreads((data as any[]) ?? []);

      channel = supabase.channel(`tickets:${u.id}`)
        .on("postgres_changes",
          { event: "*", schema: "public", table: "support_threads", filter: `user_id=eq.${u.id}` },
          async () => {
            const { data: d } = await supabase
              .from("support_threads")
              .select("id,status,priority,last_message,last_message_at,ai_escalated,ai_last_category,unread_user,created_at")
              .eq("user_id", u.id)
              .order("last_message_at", { ascending: false });
            setThreads((d as any[]) ?? []);
          })
        .subscribe();
    })();
    return () => { if (channel) supabase.removeChannel(channel); };
  }, [user]);

  if (!user) return null;

  return (
    <Layout>
      <div className="container max-w-2xl pt-6 pb-32 animate-liquid-in space-y-4">
        <header className="flex items-center justify-between gap-2">
          <h1 className="font-imperial font-black text-2xl sm:text-3xl flex items-center gap-2 tracking-[0.04em]">
            <MessageSquare className="w-5 h-5 text-primary" />
            <span className="text-gradient-primary">내 티켓</span>
          </h1>
          <Link to="/support" className="text-xs text-primary underline-offset-4 hover:underline">
            새 문의하기
          </Link>
        </header>

        {threads === null ? (
          <LoadingList rows={3} />
        ) : threads.length === 0 ? (
          <EmptyState
            icon={<MessageSquare className="h-6 w-6" />}
            title="아직 티켓이 없습니다"
            description="고객지원 채팅에서 문의를 보내면 자동으로 티켓이 생성됩니다."
          />
        ) : (
          <ul className="space-y-3">
            {threads.map(t => {
              const meta = STATUS_META[t.status];
              const Icon = meta.icon;
              return (
                <li key={t.id}>
                  <button
                    onClick={() => nav("/support")}
                    className="w-full text-left glass-strong rounded-2xl border border-border/40 p-4 hover:border-primary/50 transition flex items-center gap-3 min-h-[64px]"
                  >
                    <div className={`shrink-0 w-10 h-10 rounded-xl border ${meta.tone} flex items-center justify-center`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="text-sm font-bold">{meta.label}</span>
                        <span className={`text-[10px] font-bold uppercase rounded-full px-2 py-0.5 ${PRIORITY_TONE[t.priority]}`}>
                          {t.priority}
                        </span>
                        {t.ai_escalated && (
                          <span className="text-[10px] font-bold uppercase rounded-full px-2 py-0.5 bg-destructive/15 text-destructive flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3" /> 에스컬레이션
                          </span>
                        )}
                        {t.ai_last_category && (
                          <span className="text-[10px] text-muted-foreground">#{t.ai_last_category}</span>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground truncate">
                        {t.last_message ?? "(메시지 없음)"}
                      </div>
                      <div className="text-[10px] text-muted-foreground mt-1">
                        {formatDistanceToNow(new Date(t.last_message_at), { addSuffix: true, locale: ko })}
                      </div>
                    </div>
                    {t.unread_user > 0 && (
                      <span className="bg-primary text-primary-foreground text-[10px] font-bold rounded-full min-w-[20px] h-5 px-1.5 flex items-center justify-center">
                        {t.unread_user}
                      </span>
                    )}
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </Layout>
  );
}
