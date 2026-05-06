import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "@/components/Layout";
import { useDB, uid } from "@/lib/store";
import { Send, MessageSquare, ChevronDown } from "lucide-react";

const FAQ = [
  { q: "출금은 얼마나 걸리나요?", a: "관리자 승인 후 평균 30분, 최대 1시간 이내 자동 정산됩니다." },
  { q: "VIP 패키지는 어떻게 작동하나요?", a: "패키지 가입 후 매일 정해진 시간에 자동 정산되며, 등급에 따라 미션이 잠금 해제됩니다." },
  { q: "코인 출금 시 거래코드가 무엇인가요?", a: "관리자 승인 후 발급되는 코드를 통해 USDT가 전송됩니다." },
  { q: "출금 비밀번호를 잊어버렸어요", a: "고객센터 1:1 문의를 통해 본인 인증 후 재설정 가능합니다." },
];

export default function Support() {
  const [db, setDb] = useDB();
  const nav = useNavigate();
  const [text, setText] = useState("");
  const [tab, setTab] = useState<"chat" | "faq">("chat");
  const [open, setOpen] = useState<number | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  if (!db.user) { nav("/auth"); return null; }
  const u = db.user;
  const messages = db.chats.filter(c => c.threadId === u.id).sort((a, b) => a.createdAt - b.createdAt);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages.length]);

  function send() {
    if (!text.trim()) return;
    const t = text.trim();
    setText("");
    setDb(d => {
      const newMsg = { id: uid(), threadId: u.id, from: "user" as const, text: t, createdAt: Date.now() };
      const exists = d.threads.find(x => x.id === u.id);
      const threads = exists
        ? d.threads.map(x => x.id === u.id ? { ...x, updatedAt: Date.now(), unread: x.unread + 1 } : x)
        : [...d.threads, { id: u.id, nickname: u.nickname, unread: 1, updatedAt: Date.now() }];
      return { ...d, chats: [...d.chats, newMsg], threads };
    });
    // Simulated auto-reply after 2s if no admin online
    setTimeout(() => {
      setDb(d => {
        const last = d.chats.filter(c => c.threadId === u.id).slice(-1)[0];
        if (!last || last.from === "admin") return d;
        return { ...d, chats: [...d.chats, { id: uid(), threadId: u.id, from: "admin", text: "AI 콘시어지: 곧 담당 매니저가 연결됩니다. 잠시만 기다려주세요. 🤖", createdAt: Date.now() }] };
      });
    }, 1800);
  }

  return (
    <Layout>
      <div className="container pt-6 pb-32">
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
                <div key={m.id} className={`flex ${m.from === "user" ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[78%] px-4 py-2.5 rounded-2xl text-sm ${m.from === "user" ? "bg-gradient-primary text-primary-foreground glow-primary" : "glass"}`}>
                    {m.text}
                    <div className="text-[9px] opacity-60 mt-1">{new Date(m.createdAt).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })}</div>
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
                {open === i && <p className="mt-3 text-xs text-muted-foreground leading-relaxed border-t border-border/40 pt-3">{f.a}</p>}
              </button>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
