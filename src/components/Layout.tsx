import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  Home,
  Target,
  Wallet,
  Crown,
  User as UserIcon,
  Sparkles,
  LogOut,
  ShieldCheck,
  MessageSquare,
  MessageCircle,
  X,
} from "lucide-react";
import { useDB } from "@/lib/store";
import React, { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { ScrollArea } from "./ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";

const items = [
  { to: "/dashboard", icon: Home, label: "홈" },
  { to: "/missions", icon: Target, label: "미션" },
  { to: "/packages", icon: Crown, label: "패키지" },
  { to: "/wallet", icon: Wallet, label: "지갑" },
  { to: "/support", icon: MessageSquare, label: "고객센터" },
  { to: "/profile", icon: UserIcon, label: "MY" },
];

export default function Layout({ children }: { children: React.ReactNode }) {
  const [db, setDb] = useDB();
  const nav = useNavigate();
  const loc = useLocation();
  const user = db.user;

  // ==================== Empire Floating Chat (무한 루프 완전 해결) ====================
  // Inner component로 분리해서 Layout 자체는 안정적으로 유지
  const FloatingChat = () => {
    const [isChatOpen, setIsChatOpen] = useState(false);
    const [messages, setMessages] = useState<any[]>([]);
    const [newMessage, setNewMessage] = useState("");
    const [roomId, setRoomId] = useState<"general" | "empire">("general");
    const scrollRef = useRef<HTMLDivElement>(null);
    const channelRef = useRef<any>(null);

    // Empire 자동 room 설정 (안정적으로 처리)
    useEffect(() => {
      const tier = (user as any)?.profile?.tier;
      setRoomId(tier === "EMPIRE" ? "empire" : "general");
    }, [user]);

    // 메시지 불러오기 + Realtime (안정화된 버전)
    const connectChat = useCallback(async () => {
      if (!roomId) return;

      // 이전 채널 정리
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }

      const { data } = await (supabase as any)
        .from("messages")
        .select(
          `
          id,
          content,
          created_at,
          user_id,
          profiles!messages_user_id_fkey (username, avatar_url, tier)
        `,
        )
        .eq("room_id", roomId)
        .order("created_at", { ascending: true });

      setMessages(data || []);

      const channel = (supabase as any)
        .channel(`chat:${roomId}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "messages",
            filter: `room_id=eq.${roomId}`,
          },
          (payload: any) => {
            setMessages((prev) => [...prev, payload.new]);
          },
        )
        .subscribe();

      channelRef.current = channel;
    }, [roomId]);

    useEffect(() => {
      if (isChatOpen) {
        connectChat();
      }
      return () => {
        if (channelRef.current) {
          supabase.removeChannel(channelRef.current);
          channelRef.current = null;
        }
      };
    }, [isChatOpen, connectChat]);

    // 스크롤 자동 하단
    useEffect(() => {
      if (scrollRef.current) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      }
    }, [messages]);

    const sendMessage = useCallback(
      async (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!newMessage.trim() || !user) return;

        await (supabase as any).from("messages").insert({
          room_id: roomId,
          user_id: user.id,
          content: newMessage.trim(),
        });

        setNewMessage("");
      },
      [newMessage, user, roomId],
    );

    const isEmpireRoom = roomId === "empire";
    const toggleChat = () => setIsChatOpen(!isChatOpen);

    return (
      <>
        {/* Floating Button */}
        <button
          onClick={toggleChat}
          className="fixed bottom-8 right-8 z-50 w-14 h-14 rounded-2xl glass-strong neon-border flex items-center justify-center shadow-2xl hover:scale-110 transition-all duration-300 group"
        >
          <MessageCircle className="w-7 h-7 text-cyber-blue group-hover:text-neon-orange transition-colors" />
          {isEmpireRoom && (
            <div className="absolute -top-1 -right-1 w-5 h-5 bg-gold rounded-full flex items-center justify-center text-[10px] font-black text-black animate-pulse">
              👑
            </div>
          )}
        </button>

        {/* Chat Panel */}
        {isChatOpen && (
          <div className="fixed bottom-28 right-8 z-[9999] w-[380px] h-[520px] glass-strong neon-border bg-black/95 backdrop-blur-3xl rounded-3xl flex flex-col shadow-2xl overflow-hidden border border-white/10">
            {/* Header */}
            <div
              className={`px-6 py-4 flex items-center gap-3 border-b ${
                isEmpireRoom ? "border-gold/40 bg-gradient-to-r from-gold/10 to-purple/10" : "border-cyber-blue/30"
              }`}
            >
              <div className={`w-3 h-3 rounded-full animate-pulse ${isEmpireRoom ? "bg-gold" : "bg-cyber-blue"}`} />
              <h2
                className={`font-bold tracking-tighter flex-1 ${isEmpireRoom ? "text-gold neon-glow-purple" : "text-cyber-blue neon-glow"}`}
              >
                {isEmpireRoom ? "👑 Empire Exclusive Lounge" : "💬 General Mission Chat"}
              </h2>
              {isEmpireRoom && (
                <span className="px-3 py-1 text-xs font-mono tracking-widest bg-gold/10 text-gold border border-gold/40 rounded-2xl">
                  LUXURY ONLY
                </span>
              )}
              <button onClick={toggleChat} className="text-white/60 hover:text-white transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Messages */}
            <ScrollArea className="flex-1 p-5 space-y-5" ref={scrollRef as any}>
              {messages.map((msg: any) => {
                const isMine = msg.user_id === user?.id;
                return (
                  <div key={msg.id} className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[78%] flex gap-3 ${isMine ? "flex-row-reverse" : ""}`}>
                      {!isMine && (
                        <Avatar className="w-8 h-8 border border-white/20 shrink-0">
                          <AvatarImage src={msg.profiles?.avatar_url} />
                          <AvatarFallback>{msg.profiles?.username?.[0] || "?"}</AvatarFallback>
                        </Avatar>
                      )}
                      <div>
                        <div
                          className={`px-4 py-3 rounded-3xl text-sm leading-relaxed ${
                            isMine
                              ? "bg-neon-orange text-white rounded-br-none"
                              : isEmpireRoom
                                ? "bg-purple/20 border border-purple/30 text-white rounded-bl-none"
                                : "bg-white/10 border border-white/10 text-white rounded-bl-none"
                          }`}
                        >
                          {msg.content}
                        </div>
                        <p className="text-[10px] text-white/40 mt-1 px-1">
                          {msg.profiles?.username || "익명"} •{" "}
                          {new Date(msg.created_at).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </ScrollArea>

            {/* Input */}
            <form onSubmit={sendMessage} className="p-4 border-t border-white/10 bg-black/70">
              <div className="flex gap-2">
                <Input
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder={isEmpireRoom ? "Empire 멤버들과 대화하세요..." : "메시지를 입력하세요..."}
                  className="glass-strong flex-1"
                />
                <Button
                  type="submit"
                  className={`px-7 ${isEmpireRoom ? "bg-gold text-black hover:bg-yellow-300" : "bg-neon-orange hover:bg-orange-500"}`}
                >
                  SEND
                </Button>
              </div>
            </form>
          </div>
        )}
      </>
    );
  };

  return (
    <div className="min-h-screen pb-24">
      {/* Top bar */}
      <header className="sticky top-0 z-40 glass border-b border-border/40">
        <div className="container flex items-center justify-between h-16">
          <Link to="/dashboard" className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-gradient-primary glow-primary flex items-center justify-center font-display font-black text-primary-foreground">
              폰
            </div>
            <span className="font-display font-bold text-lg tracking-wider">
              <span className="text-gradient-primary">PHONE</span>
              <span className="text-foreground">MISSION</span>
            </span>
          </Link>
          <div className="flex items-center gap-2">
            {user?.isAdmin && (
              <button
                onClick={() => nav("/admin")}
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-gradient-gold text-gold-foreground glow-gold"
              >
                <ShieldCheck className="w-3.5 h-3.5" /> 관리자
              </button>
            )}
            {user ? (
              <button
                onClick={() => {
                  setDb((d) => ({ ...d, user: null }));
                  nav("/");
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs glass hover:bg-muted/40 transition"
              >
                <LogOut className="w-3.5 h-3.5" /> 로그아웃
              </button>
            ) : (
              <Link
                to="/secure-auth"
                className="px-4 py-1.5 rounded-full text-xs font-semibold bg-gradient-primary text-primary-foreground glow-primary"
              >
                로그인
              </Link>
            )}
          </div>
        </div>
      </header>

      <main className="relative">{children}</main>

      {/* Bottom nav */}
      {user && (
        <nav className="fixed bottom-3 left-1/2 -translate-x-1/2 z-40 w-[calc(100%-1.5rem)] max-w-md">
          <div className="glass-strong rounded-2xl px-2 py-2 flex items-center justify-between shadow-2xl neon-border relative overflow-hidden">
            <div
              className="absolute inset-0 bg-gradient-aurora opacity-[0.06] animate-gradient pointer-events-none"
              style={{ backgroundSize: "300% 300%" }}
            />
            {items.map(({ to, icon: Icon, label }) => {
              const active = loc.pathname === to;
              return (
                <NavLink key={to} to={to} className="flex-1 press">
                  <div
                    className={`relative flex flex-col items-center gap-1 py-1.5 rounded-xl transition-all duration-500 ${active ? "bg-gradient-primary/15" : ""}`}
                  >
                    {active && (
                      <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-8 h-1 rounded-full bg-gradient-primary glow-primary" />
                    )}
                    <div
                      className={`relative transition-colors duration-300 ${active ? "text-primary" : "text-muted-foreground"}`}
                    >
                      <Icon className="w-5 h-5" />
                      {active && (
                        <div className="absolute -inset-2 rounded-full bg-primary/25 blur-md -z-10 animate-ring-pulse" />
                      )}
                    </div>
                    <span
                      className={`text-[10px] font-semibold transition-colors ${active ? "text-foreground" : "text-muted-foreground"}`}
                    >
                      {label}
                    </span>
                  </div>
                </NavLink>
              );
            })}
          </div>
        </nav>
      )}

      {/* Floating Chat (안정화된 버전) */}
      {user && <FloatingChat />}
    </div>
  );
}
