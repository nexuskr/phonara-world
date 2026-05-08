import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import Layout from "@/components/Layout";
import { useDB } from "@/lib/store";
import { supabase } from "@/integrations/supabase/client";
import { useRequireAuth } from "@/hooks/use-require-auth";
import { Send, MessageSquare, ChevronDown, BookOpen } from "lucide-react";
import { LuxButton, LuxInput, LuxChip } from "@/components/ui/lux";

const FAQ = [
  { q: "Phonara는 정말 돈을 주나요?", a: "네, 실제로 매일 수천 명의 회원님들이 출금을 하고 계십니다." },
  { q: "출금은 어떻게 하고, 최소 금액과 소요시간은?", a: "최소 출금 금액은 5,000원부터입니다. 관리자 확인 후 10분~30분 이내 입금됩니다." },
  { q: "FREE로도 충분히 벌 수 있나요?", a: "충분히 가능합니다. 더 많은 수익을 원하시면 STARTER부터 업그레이드를 추천드려요." },
  { q: "VIP 혜택?", a: "✓ 모든 미션 보상 6배\n✓ God Mode 게임\n✓ 전담 매니저\n✓ 월 출금 한도 3,000만원" },
  { q: "패키지 적립률은 어떻게 결정되나요?", a: "모든 패키지는 30일 한정·사전 공지된 확정 적립 스케줄로 운영됩니다.\n\n• 첫 3일 보너스 구간(Day 1~3): Easy 라인 +30%, Easy 150 +20%, Empire +50%\n• Day 4~30: 표기된 기본 일수익으로 자동 정산\n• Empire Day(매월 1일·15일): Empire 보유자 중 Day 4 이후 머신에 한해 +50% 자동 적용\n• 7일 연속 수확 시: 1일치 추가 보너스 1회 자동 지급\n\n모든 일정과 적립률은 사전 고지된 확정 스케줄이며 변동되지 않습니다." },
  { q: "청약철회·환불 규정", a: "전자상거래법에 따라 결제일로부터 7일 이내 청약철회가 가능합니다.\n\n단, 다음의 경우 청약철회가 제한됩니다:\n• 1회라도 일일 정산(수확)을 진행한 경우\n• 즉시 출금가능 보너스(Empire 30만원 등)를 이미 출금한 경우\n• Founding Member 좌석을 이미 점유한 경우\n\n7일 이내 위 사유에 해당하지 않으면 100% 전액 환불됩니다." },
];

type Msg = { id: string; sender: "user" | "admin"; message: string; created_at: string };

export default function Support() {
  const { t, i18n } = useTranslation("support");
  const [db] = useDB();
  const nav = useNavigate();
  const user = useRequireAuth() ?? db.user;
  const [text, setText] = useState("");
  const [tab, setTab] = useState<"chat" | "faq">("chat");
  const [open, setOpen] = useState<number | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [threadId, setThreadId] = useState<string | null>(null);
  const [authUid, setAuthUid] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages.length]);

  // bootstrap thread + load messages + subscribe
  useEffect(() => {
    if (!user) return;
    let channel: any;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setAuthUid(user.id);

      // upsert thread
      const nickname = db.user?.nickname || user.email?.split("@")[0] || t("memberFallback");
      const { data: existing } = await supabase
        .from("support_threads").select("*").eq("user_id", user.id).maybeSingle();
      let tid = existing?.id;
      if (!tid) {
        const { data: created } = await supabase.from("support_threads")
          .insert({ user_id: user.id, nickname }).select().single();
        tid = created?.id;
      }
      if (!tid) return;
      setThreadId(tid);

      const { data: msgs } = await supabase.from("support_messages")
        .select("id,sender,message,created_at").eq("thread_id", tid).order("created_at", { ascending: true });
      setMessages((msgs as Msg[]) || []);

      channel = supabase.channel(`support:${tid}`)
        .on("postgres_changes",
          { event: "INSERT", schema: "public", table: "support_messages", filter: `thread_id=eq.${tid}` },
          (payload) => setMessages(prev => [...prev, payload.new as Msg])
        ).subscribe();
    })();
    return () => { if (channel) supabase.removeChannel(channel); };
  }, [nav, user, db.user?.nickname]);

  async function send() {
    if (!text.trim() || !threadId || !authUid) return;
    const t = text.trim(); setText("");
    await supabase.from("support_messages").insert({
      thread_id: threadId, user_id: authUid, sender: "user", message: t,
    });
    await supabase.from("support_threads").update({
      last_message: t, last_message_at: new Date().toISOString(), unread_admin: (messages.filter(m=>m.sender==='user').length+1),
    }).eq("id", threadId);
  }

  if (!user) return null;

  return (
    <Layout>
      <div className="container pt-6 pb-32 animate-liquid-in">
        <h1 className="font-imperial font-black text-2xl sm:text-3xl flex items-center gap-2 mb-3 tracking-[0.04em]">
          <MessageSquare className="w-5 h-5 text-primary" /> <span className="text-gradient-primary">{t("title")}</span>
        </h1>

        <div className="flex gap-2 mb-4 flex-wrap">
          {[{ id: "chat", l: t("tabChat") }, { id: "faq", l: t("tabFaq") }].map((x: any) => (
            <LuxChip key={x.id} active={tab === x.id} onClick={() => setTab(x.id)} className="flex-1 justify-center">
              {x.l}
            </LuxChip>
          ))}
        </div>

        <button onClick={() => nav("/guide")} className="w-full glass-strong neon-border rounded-2xl p-3 mb-4 flex items-center justify-between hover:bg-muted/30 transition press min-h-[56px]">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-gold glow-gold flex items-center justify-center">
              <BookOpen className="w-4 h-4 text-gold-foreground" />
            </div>
            <div className="text-left">
              <div className="text-xs font-black break-keep">{t("guideTitle")}</div>
              <div className="text-[10px] text-muted-foreground break-keep">{t("guideSub")}</div>
            </div>
          </div>
          <ChevronDown className="w-4 h-4 -rotate-90 text-gold" />
        </button>

        {tab === "chat" && (
          <div className="glass-strong rounded-3xl neon-border overflow-hidden flex flex-col h-[60vh]">
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {messages.length === 0 && (
                <div className="text-center text-xs text-muted-foreground mt-10 break-keep">
                  <div className="text-3xl mb-2">💬</div>
                  {t("hello")}<br />
                  {t("helloSub")}
                </div>
              )}
              {messages.map(m => (
                <div key={m.id} className={`flex ${m.sender === "user" ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[78%] px-4 py-2.5 rounded-2xl text-sm ${m.sender === "user" ? "bg-gradient-primary text-primary-foreground glow-primary" : "glass"}`}>
                    {m.message}
                    <div className="text-[9px] opacity-60 mt-1 tabular-nums">{new Date(m.created_at).toLocaleTimeString(i18n.language === "en" ? "en-US" : "ko-KR", { hour: "2-digit", minute: "2-digit" })}</div>
                  </div>
                </div>
              ))}
              <div ref={endRef} />
            </div>
            <div className="border-t border-border/40 p-3 flex gap-2">
              <LuxInput value={text} onChange={e => setText(e.target.value)} onKeyDown={e => e.key === "Enter" && send()}
                placeholder={t("placeholder")} />
              <LuxButton onClick={send} variant="primary" size="md" className="!min-w-[48px] !px-0 w-12"><Send className="w-4 h-4" /></LuxButton>
            </div>
          </div>
        )}

        {tab === "faq" && (
          <div className="space-y-2">
            {FAQ.map((f, i) => (
              <button key={i} onClick={() => setOpen(open === i ? null : i)} className="w-full glass rounded-2xl p-4 text-left">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm font-bold">Q. {f.q}</span>
                  <ChevronDown className={`w-4 h-4 transition ${open === i ? "rotate-180 text-primary" : "text-muted-foreground"}`} />
                </div>
                {open === i && <p className="mt-3 text-xs text-muted-foreground leading-relaxed border-t border-border/40 pt-3 whitespace-pre-line">{f.a}</p>}
              </button>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
