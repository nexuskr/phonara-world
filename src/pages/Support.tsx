import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import Layout from "@/components/Layout";
import { useDB } from "@/lib/store";
import { supabase } from "@/integrations/supabase/client";
import { useRequireAuth } from "@/hooks/use-require-auth";
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

      channel = supabase.channel(`support:${tid}:${Math.random().toString(36).slice(2)}`)
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
