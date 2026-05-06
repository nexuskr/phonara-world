import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "@/components/Layout";
import { useDB, uid } from "@/lib/store";
import { Send, MessageSquare, ChevronDown, BookOpen } from "lucide-react";

const FAQ = [
  { q: "폰미션은 정말 돈을 주나요?", a: "네, 실제로 매일 수천 명의 회원님들이 출금을 하고 계십니다. 현재까지 누적 정산액은 128억 원을 넘어섰으며, 하루 평균 1억 2,800만원 이상이 입금되고 있습니다." },
  { q: "출금은 어떻게 하고, 최소 금액과 소요시간은?", a: "최소 출금 금액은 5,000원부터입니다. 출금 신청 후 6자리 인증번호 + 6자리 출금비밀번호 입력 → 관리자 확인 후 10분~30분 이내 당일에 입금됩니다." },
  { q: "FREE로도 충분히 벌 수 있나요?", a: "충분히 가능합니다. FREE 사용자도 매일 미션과 게임을 통해 수익을 내고 있으며, 실제로 많은 분들이 FREE로 첫 출금을 성공했습니다. 더 많은 수익을 원하시면 STARTER(49,000원)부터 업그레이드를 추천드려요." },
  { q: "VIP로 업그레이드하면 정확히 어떤 혜택이 있나요?", a: "✓ 모든 미션 보상 6배\n✓ 고액 UGC 미션 풀 완전 오픈\n✓ God Mode 전용 고배율 게임\n✓ 실시간 랭킹 Top 500 고정\n✓ 전담 매니저 1:1 채팅\n✓ 월 출금 한도 3,000만원, 수수료 5%" },
  { q: "코인 충전은 어떻게 하나요?", a: "지갑 → Coin 탭에서 코인 주소와 QR코드를 확인한 후 송금하시면 됩니다. 6자리 인증번호 + 6자리 출금비밀번호 입력 후 즉시 충전됩니다." },
  { q: "미션 완료 후 승인은 얼마나 걸리나요?", a: "일반 미션: 즉시 ~ 5분 이내 자동 승인\nUGC 미션: Gemini Vision 검토 후 최대 30분 이내 승인" },
  { q: "출금 수수료와 한도는 어떻게 되나요?", a: "FREE: 35% (월 50만원)\nSTARTER: 20% (월 300만원)\nPRO: 12% (월 1,000만원)\nVIP: 5% (월 3,000만원)\nGOD MODE: 3% (월 1억원)\nEMPIRE: 0% (무제한)" },
  { q: "환불은 가능한가요?", a: "❌ 환불은 절대 불가능합니다. 모든 티어(STARTER 이상)는 가입 즉시 서비스가 시작되므로 환불이 되지 않습니다. 신중하게 선택해 주시기 바랍니다." },
  { q: "개인정보는 안전한가요?", a: "네, 256bit Quantum Encryption과 금융기관 수준의 보안 시스템을 사용하고 있습니다. 개인정보는 출금과 본인확인 목적으로만 사용되며, 제3자에게 절대 제공하지 않습니다." },
  { q: "Empire 티어는 어떤 사람들을 위한 건가요?", a: "Empire는 플랫폼을 함께 키우고 수익을 공유받고 싶은 진짜 오너들을 위한 최상위 티어입니다. 선착순 20명 한정이며, 플랫폼 전체 수익의 10~15%를 평생 공유받을 수 있습니다." },
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
                {open === i && <p className="mt-3 text-xs text-muted-foreground leading-relaxed border-t border-border/40 pt-3 whitespace-pre-line">{f.a}</p>}
              </button>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
