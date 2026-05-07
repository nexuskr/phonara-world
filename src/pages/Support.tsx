import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "@/components/Layout";
import { useDB } from "@/lib/store";
import { supabase } from "@/integrations/supabase/client";
import { Send, MessageSquare, ChevronDown, BookOpen } from "lucide-react";

const FAQ = [
  { q: "폰미션은 정말 돈을 주나요?", a: "네, 실제로 매일 수천 명의 회원님들이 출금을 하고 계십니다." },
  { q: "출금은 어떻게 하고, 최소 금액과 소요시간은?", a: "최소 출금 금액은 5,000원부터입니다. 관리자 확인 후 10분~30분 이내 입금됩니다." },
  { q: "FREE로도 충분히 벌 수 있나요?", a: "충분히 가능합니다. 더 많은 수익을 원하시면 STARTER부터 업그레이드를 추천드려요." },
  { q: "VIP 혜택?", a: "✓ 모든 미션 보상 6배\n✓ God Mode 게임\n✓ 전담 매니저\n✓ 월 출금 한도 3,000만원" },
  { q: "환불은 가능한가요?", a: "❌ 환불은 절대 불가능합니다. 신중히 선택해 주세요." },
];

type Msg = { id: string; sender: "user" | "admin"; message: string; created_at: string };

export default function Support() {
  const [db] = useDB();
  const nav = useNavigate();
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
    let channel: any;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { nav("/secure-auth"); return; }
      setAuthUid(user.id);

      // upsert thread
      const nickname = db.user?.nickname || user.email?.split("@")[0] || "회원";
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
  }, [db.user?.nickname, nav]);

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

  useEffect(() => { if (!db.user) nav("/secure-auth", { replace: true }); }, [db.user, nav]);
  if (!db.user) return null;

  return (
    <Layout>
      <div className="container pt-6 pb-32 animate-liquid-in">
        <h1 className="font-display font-black text-2xl flex items-center gap-2 mb-3">
          <MessageSquare className="w-5 h-5 text-primary" /> <span className="text-gradient-primary">고객센터</span>
        </h1>

        <div className="flex gap-2 mb-4">
          {[{ id: "chat", l: "1:1 라이브 채팅" }, { id: "faq", l: "FAQ" }].map((t: any) => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition ${tab === t.id ? "bg-gradient-primary text-primary-foreground glow-primary" : "glass text-muted-foreground"}`}>
              {t.l}
            </button>
          ))}
        </div>

        <button onClick={() => nav("/guide")} className="w-full glass-strong neon-border rounded-2xl p-3 mb-4 flex items-center justify-between hover:bg-muted/30 transition press">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-gold glow-gold flex items-center justify-center">
              <BookOpen className="w-4 h-4 text-gold-foreground" />
            </div>
            <div className="text-left">
              <div className="text-xs font-black">운영원칙 & 이용가이드</div>
              <div className="text-[10px] text-muted-foreground">등급 · 잭팟 · 충전/환전 완전 정리</div>
            </div>
          </div>
          <ChevronDown className="w-4 h-4 -rotate-90 text-gold" />
        </button>

        {tab === "chat" && (
          <div className="glass-strong rounded-3xl neon-border overflow-hidden flex flex-col h-[60vh]">
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {messages.length === 0 && (
                <div className="text-center text-xs text-muted-foreground mt-10">
                  <div className="text-3xl mb-2">💬</div>
                  안녕하세요! 무엇을 도와드릴까요?<br />
                  실시간 매니저가 응답해드립니다.
                </div>
              )}
              {messages.map(m => (
                <div key={m.id} className={`flex ${m.sender === "user" ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[78%] px-4 py-2.5 rounded-2xl text-sm ${m.sender === "user" ? "bg-gradient-primary text-primary-foreground glow-primary" : "glass"}`}>
                    {m.message}
                    <div className="text-[9px] opacity-60 mt-1">{new Date(m.created_at).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })}</div>
                  </div>
                </div>
              ))}
              <div ref={endRef} />
            </div>
            <div className="border-t border-border/40 p-3 flex gap-2">
              <input value={text} onChange={e => setText(e.target.value)} onKeyDown={e => e.key === "Enter" && send()}
                placeholder="메시지를 입력하세요"
                className="flex-1 bg-input/60 border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-primary" />
              <button onClick={send} className="w-11 h-11 rounded-xl bg-gradient-primary text-primary-foreground glow-primary flex items-center justify-center"><Send className="w-4 h-4" /></button>
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
