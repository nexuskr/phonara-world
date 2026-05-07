import { useEffect, useRef, useState } from "react";
import { MessageCircle, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useDB } from "@/lib/store";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { ScrollArea } from "./ui/scroll-area";

type Msg = { id: string; message: string; created_at: string; user_id: string | null; nickname: string | null };

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
        .select("*")
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
      <button
        onClick={() => setOpen((v) => !v)}
        className="fixed bottom-24 right-4 z-50 w-14 h-14 rounded-2xl glass-strong neon-border flex items-center justify-center shadow-2xl hover:scale-110 transition"
        aria-label="실시간 채팅"
      >
        <MessageCircle className="w-6 h-6 text-secondary" />
        {isEmpire && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-gold rounded-full flex items-center justify-center text-[10px] font-black text-black animate-pulse">👑</span>
        )}
      </button>

      {open && (
        <div className="fixed bottom-44 right-4 z-[9999] w-[min(92vw,380px)] h-[480px] glass-strong rounded-3xl flex flex-col shadow-2xl overflow-hidden border border-border">
          <div className={`px-5 py-3 flex items-center gap-3 border-b border-border ${isEmpire ? "bg-gradient-gold/10" : ""}`}>
            <div className={`w-2.5 h-2.5 rounded-full animate-pulse ${isEmpire ? "bg-gold" : "bg-secondary"}`} />
            <h2 className={`font-bold flex-1 text-sm ${isEmpire ? "text-gold" : "text-foreground"}`}>
              {isEmpire ? "👑 Empire 라운지" : "💬 실시간 채팅"}
            </h2>
            <button onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground">
              <X className="w-4 h-4" />
            </button>
          </div>

          <ScrollArea className="flex-1 p-4" ref={scrollRef as any}>
            <div className="space-y-3">
              {messages.map((m) => {
                const mine = m.user_id === user.id;
                return (
                  <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                    <div className="max-w-[78%]">
                      {!mine && <p className="text-[10px] text-muted-foreground mb-0.5 px-1">{m.nickname || "익명"}</p>}
                      <div className={`px-3 py-2 rounded-2xl text-sm ${mine ? "bg-primary text-primary-foreground rounded-br-sm" : "bg-muted text-foreground rounded-bl-sm"}`}>
                        {m.message}
                      </div>
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
