import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import Layout from "@/components/Layout";
import { useDB } from "@/lib/store";
import { supabase } from "@/integrations/supabase/client";
import { useRequireAuth } from "@/hooks/use-require-auth";
import { useChatChannel } from "@pkg/realtime";
import { Send, MessageSquare, ChevronDown, BookOpen, Sparkles } from "lucide-react";
import { LuxButton, LuxInput, LuxChip } from "@/components/ui/lux";

const FAQ_KEYS = [
  { q: "q1", a: "a1" },
  { q: "q2", a: "a2" },
  { q: "q3", a: "a3" },
  { q: "q4", a: "a4" },
  { q: "q5", a: "a5" },
  { q: "q6", a: "a6" },
] as const;

type Msg = { id: string; sender: "user" | "admin" | "ai" | "system"; message: string; created_at: string };

export default function Support() {
  const { t, i18n } = useTranslation("support");
  const { t: tFaq } = useTranslation("faq");
  const [db] = useDB();
  const nav = useNavigate();
  const user = useRequireAuth() ?? db.user;
  const [text, setText] = useState("");
  const [aiBusy, setAiBusy] = useState(false);
  const [tab, setTab] = useState<"chat" | "faq">("chat");
  const [open, setOpen] = useState<number | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [threadId, setThreadId] = useState<string | null>(null);
  const [authUid, setAuthUid] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages.length, aiBusy]);

  // bootstrap thread + load messages
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      const { data: { user: au } } = await supabase.auth.getUser();
      if (!au || cancelled) return;
      setAuthUid(au.id);

      const nickname = db.user?.nickname || au.email?.split("@")[0] || t("memberFallback");
      const { data: existing } = await supabase
        .from("support_threads").select("*").eq("user_id", au.id).maybeSingle();
      let tid = existing?.id;
      if (!tid) {
        const { data: created } = await supabase.from("support_threads")
          .insert({ user_id: au.id, nickname }).select().single();
        tid = created?.id;
      }
      if (!tid || cancelled) return;
      setThreadId(tid);

      const { data: msgs } = await supabase.from("support_messages")
        .select("id,sender,message,created_at").eq("thread_id", tid).order("created_at", { ascending: true });
      if (!cancelled) setMessages((msgs as Msg[]) || []);
    })();
    return () => { cancelled = true; };
  }, [nav, user, db.user?.nickname, t]);

  // Idempotent realtime, keyed by thread — survives StrictMode double-mount.
  useChatChannel({
    key: threadId ? `support:${threadId}` : "",
    bindings: threadId
      ? [{ event: "INSERT", table: "support_messages", filter: `thread_id=eq.${threadId}` }]
      : [],
    onEvent: (payload) => setMessages((prev) => [...prev, payload.new as unknown as Msg]),
    enabled: !!threadId,
  });

  async function send() {
    if (!text.trim() || !threadId || !authUid || aiBusy) return;
    const raw = text.trim();
    setText("");

    // 클라이언트 측 PII 마스킹: 서버 저장 전에 안전한 텍스트만 INSERT
    const { maskPii, PII_LABEL } = await import("@/lib/pii");
    const { masked, hits } = maskPii(raw);
    const piiDetected = hits.length > 0;
    if (piiDetected) {
      const { notify } = await import("@/lib/notify");
      const kinds = Array.from(new Set(hits.map(h => h.kind))).map(k => PII_LABEL[k]).join(", ");
      notify.warning("개인정보 자동 마스킹", {
        description: `${kinds} 정보가 안전하게 가려졌습니다.`,
      });
    }

    await supabase.from("support_messages").insert({
      thread_id: threadId, user_id: authUid, sender: "user",
      message: masked, pii_masked: piiDetected,
    });
    await supabase.from("support_threads").update({
      last_message: masked, last_message_at: new Date().toISOString(),
      ...(piiDetected ? { last_pii_at: new Date().toISOString() } : {}),
    }).eq("id", threadId);

    // Trigger AI 1차 응답 (마스킹된 메시지 전송)
    setAiBusy(true);
    try {
      const { error } = await supabase.functions.invoke("ai-support-reply", {
        body: { thread_id: threadId, message: masked },
      });
      if (error) {
        const status = (error as any)?.context?.status;
        if (status === 429) console.warn("AI rate limited");
        else if (status === 402) console.warn("AI credits exhausted");
        else console.error("ai-support-reply error:", error);
      }
    } catch (e) {
      console.error("ai-support-reply invoke failed:", e);
    } finally {
      setAiBusy(false);
    }
  }

  if (!user) return null;

  return (
    <Layout>
      <div className="container pt-6 pb-32 animate-liquid-in">
        <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
          <h1 className="font-imperial font-black text-2xl sm:text-3xl flex items-center gap-2 tracking-[0.04em]">
            <MessageSquare className="w-5 h-5 text-primary" /> <span className="text-gradient-primary">{t("title")}</span>
          </h1>
          <button
            type="button"
            onClick={() => nav("/support/tickets")}
            className="text-xs text-primary underline-offset-4 hover:underline whitespace-nowrap"
          >
            내 티켓 보기 →
          </button>
        </div>

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
              {messages.map(m => {
                const isUser = m.sender === "user";
                const isAi = m.sender === "ai";
                const isSystem = m.sender === "system";
                if (isSystem) {
                  return (
                    <div key={m.id} className="flex justify-center">
                      <div className="text-[11px] text-muted-foreground bg-muted/30 rounded-full px-3 py-1 border border-border/40">
                        {m.message}
                      </div>
                    </div>
                  );
                }
                return (
                  <div key={m.id} className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[78%] px-4 py-2.5 rounded-2xl text-sm whitespace-pre-wrap break-words ${
                      isUser
                        ? "bg-gradient-primary text-primary-foreground glow-primary"
                        : isAi
                          ? "glass border border-primary/30"
                          : "glass"
                    }`}>
                      {isAi && (
                        <div className="flex items-center gap-1 text-[10px] font-bold text-primary mb-1">
                          <Sparkles className="w-3 h-3" /> AI 1차 응답
                        </div>
                      )}
                      {m.message}
                      <div className="text-[9px] opacity-60 mt-1 tabular-nums">{new Date(m.created_at).toLocaleTimeString(i18n.language === "en" ? "en-US" : "ko-KR", { hour: "2-digit", minute: "2-digit" })}</div>
                    </div>
                  </div>
                );
              })}
              {aiBusy && (
                <div className="flex justify-start">
                  <div className="glass border border-primary/30 px-4 py-2.5 rounded-2xl text-sm flex items-center gap-2 text-muted-foreground">
                    <Sparkles className="w-3 h-3 text-primary animate-pulse" />
                    <span className="animate-pulse">AI가 답변을 작성 중...</span>
                  </div>
                </div>
              )}
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
            {FAQ_KEYS.map((f, i) => (
              <button key={i} onClick={() => setOpen(open === i ? null : i)} className="w-full glass rounded-2xl p-4 text-left min-h-[56px]">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm font-bold break-keep">Q. {tFaq(f.q)}</span>
                  <ChevronDown className={`w-4 h-4 transition shrink-0 ${open === i ? "rotate-180 text-primary" : "text-muted-foreground"}`} />
                </div>
                {open === i && <p className="mt-3 text-xs text-muted-foreground leading-relaxed border-t border-border/40 pt-3 whitespace-pre-line break-keep">{tFaq(f.a)}</p>}
              </button>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
