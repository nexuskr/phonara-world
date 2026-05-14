import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { MessageCircle, X, Bot } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useDB } from "@/lib/store";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { ScrollArea } from "./ui/scroll-area";
import { FloatingSlot } from "./ui/floating-dock";

type Msg = {
  id: string; message: string; created_at: string;
  user_id: string | null; nickname: string | null;
  kind?: string | null; metadata?: any;
};

export default function FloatingChat() {
  const [db] = useDB();
  const user = db.user;
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  const isEmpire = (user?.tier ?? "").toString().toUpperCase() === "EMPIRE";

  useEffect(() => {
    if (!open) return;
    let mounted = true;
    (async () => {
      const { data } = await supabase
        .from("chat_messages")
        .select("id, message, created_at, nickname, kind")
        .order("created_at", { ascending: true })
        .limit(100);
      if (mounted) setMessages((data ?? []) as Msg[]);
    })();
    const channel = supabase
      .channel("public:chat_messages")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "chat_messages" }, (payload) => {
        setMessages((prev) => [...prev, payload.new as Msg]);
      })
      .subscribe();
    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
  }, [open]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  const send = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const t = text.trim();
    if (!t || !user) return;
    setText("");
    await supabase.from("chat_messages").insert({
      message: t,
      user_id: user.id,
      nickname: user.nickname,
    } as any);
  };

  if (!user) return null;

  return (
    <>
      <FloatingSlot slot="bottomRight" order={1}>
        <button
          onClick={() => setOpen((v) => !v)}
          className="w-14 h-14 rounded-2xl glass-strong neon-border flex items-center justify-center shadow-2xl hover:scale-110 transition relative"
          aria-label="AI 황제 자문관"
        >
          <MessageCircle className="w-6 h-6 text-gold" />
          {isEmpire && (
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-gold rounded-full flex items-center justify-center text-[10px] font-black text-black animate-pulse">👑</span>
          )}
        </button>
      </FloatingSlot>

      {open && (
        <div
          className="fixed right-4 z-[90] w-[min(92vw,380px)] h-[min(70vh,480px)] glass-strong rounded-3xl flex flex-col shadow-2xl overflow-hidden border border-border"
          style={{ bottom: "calc(var(--bottom-nav-h, 0px) + env(safe-area-inset-bottom) + 5.5rem)" }}
        >
          <div className={`px-5 py-3 flex items-center gap-3 border-b border-border ${isEmpire ? "bg-gradient-gold/10" : ""}`}>
            <div className={`w-2.5 h-2.5 rounded-full animate-pulse ${isEmpire ? "bg-gold" : "bg-gold"}`} />
            <h2 className="font-bold flex-1 text-sm text-gold">
              👑 AI 황제 자문관
            </h2>
            <button onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground">
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Phase 4 — 첫 진입 프리셋 3버튼 */}
          {messages.length === 0 && (
            <div className="mx-3 mt-3 grid grid-cols-1 gap-1.5">
              {["내 등급은?", "지금 뭐 해야 돼?", "출금 언제 가능?"].map((q) => (
                <button
                  key={q}
                  onClick={() => setText(q)}
                  className="press text-left text-xs font-bold px-3 py-2 rounded-xl glass border border-gold/30 hover:border-gold/60 transition break-keep"
                >
                  💬 {q}
                </button>
              ))}
            </div>
          )}

          {isEmpire && (
            <Link
              to="/missions"
              onClick={() => setOpen(false)}
              className="mx-3 mt-3 px-3 py-2 rounded-xl bg-gradient-to-r from-gold/20 to-primary/20 border border-gold/40 flex items-center gap-2 text-xs font-bold hover:scale-[1.02] transition"
            >
              <Bot className="w-4 h-4 text-gold" />
              <span className="flex-1 text-gold">Empire AI 봇 바로가기 (3종 무제한)</span>
              <span className="text-[10px] text-muted-foreground">→</span>
            </Link>
          )}

          <ScrollArea className="flex-1 p-4" ref={scrollRef as any}>
            <div className="space-y-3">
              {messages.map((m) => {
                const mine = m.user_id === user.id;
                return (
                  <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                    <div className="max-w-[85%]">
                      {!mine && <p className="text-[10px] text-muted-foreground mb-0.5 px-1">{m.nickname || "익명"}</p>}
                      {m.kind === "ai_bot_share" ? (
                        <BotShareCard mine={mine} msg={m.message} meta={m.metadata} />
                      ) : (
                        <div className={`px-3 py-2 rounded-2xl text-sm ${mine ? "bg-primary text-primary-foreground rounded-br-sm" : "bg-muted text-foreground rounded-bl-sm"}`}>
                          {m.message}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>

          <form onSubmit={send} className="p-3 border-t border-border flex gap-2">
            <Input value={text} onChange={(e) => setText(e.target.value)} placeholder="메시지를 입력하세요..." className="flex-1" />
            <Button type="submit" className="px-5">전송</Button>
          </form>
        </div>
      )}
    </>
  );
}

function BotShareCard({ mine, msg, meta }: { mine: boolean; msg: string; meta: any }) {
  const kind = meta?.bot_kind as "content" | "trading" | "image" | undefined;
  const tier = (meta?.tier ?? "").toString().toUpperCase();
  const reward = Number(meta?.reward ?? 0);
  const pnl = meta?.pnl_pct;
  const text = meta?.output_text as string | undefined;
  const path = meta?.output_path as string | undefined;
  const [imgUrl, setImgUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!path) return;
    let alive = true;
    supabase.storage.from("ai-outputs").createSignedUrl(path, 3600)
      .then(({ data }) => alive && setImgUrl(data?.signedUrl ?? null));
    return () => { alive = false; };
  }, [path]);

  const accent =
    kind === "trading" ? "from-secondary/30 to-primary/10 border-secondary/40"
    : kind === "image" ? "from-accent/30 to-primary/10 border-accent/40"
    : "from-primary/30 to-accent/10 border-primary/40";
  const icon = kind === "trading" ? "📈" : kind === "image" ? "🎨" : "🤖";

  return (
    <div className={`rounded-2xl border bg-gradient-to-br ${accent} p-3 shadow-lg ${mine ? "rounded-br-sm" : "rounded-bl-sm"}`}>
      <div className="flex items-center gap-2 mb-1.5">
        <span className="text-base">{icon}</span>
        <span className="text-[10px] font-black px-1.5 py-0.5 rounded-full bg-gold/30 text-gold">{tier || "BOT"}</span>
        <span className="text-[10px] text-muted-foreground ml-auto">AI 봇 정산</span>
      </div>
      <div className="font-display font-black text-sm leading-tight">{msg}</div>
      {imgUrl && (
        <div className="mt-2 rounded-lg overflow-hidden aspect-video bg-muted">
          <img src={imgUrl} alt="bot" className="w-full h-full object-cover" loading="lazy" />
        </div>
      )}
      {text && !imgUrl && (
        <p className="mt-1.5 text-[11px] text-foreground/80 line-clamp-3 whitespace-pre-line">{text}</p>
      )}
      {typeof pnl === "number" && (
        <div className={`mt-1.5 text-[10px] font-bold ${pnl >= 0 ? "text-secondary" : "text-destructive"}`}>
          PnL {pnl >= 0 ? "+" : ""}{Number(pnl).toFixed(2)}% · 보상 +{reward.toLocaleString()}원
        </div>
      )}
    </div>
  );
}
