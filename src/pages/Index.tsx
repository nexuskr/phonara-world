import { Link } from "react-router-dom";
import { ShieldCheck, Zap, Lock, Sparkles, ArrowRight, TrendingUp, Globe, Cpu, Users, Flame } from "lucide-react";

import { useEffect, useState } from "react";
import Particles from "@/components/Particles";
import PayoutTicker from "@/components/PayoutTicker";
import { useOnline, useMembers } from "@/components/LiveStats";
import { supabase } from "@/lib/supabase";

/* =========================
   🔥 부드러운 숫자 증가
========================= */
function useSmoothCounter(value: number) {
  const [display, setDisplay] = useState(value);

  useEffect(() => {
    let frame: number;
    const start = display;
    const diff = value - start;
    let startTime: number;

    const animate = (t: number) => {
      if (!startTime) startTime = t;
      const progress = Math.min((t - startTime) / 800, 1);
      const eased = 1 - Math.pow(1 - progress, 3);

      setDisplay(Math.floor(start + diff * eased));

      if (progress < 1) frame = requestAnimationFrame(animate);
    };

    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [value]);

  return display;
}

/* =========================
   🔥 실시간 채팅 (Supabase + fallback)
========================= */
function LiveChat() {
  const [messages, setMessages] = useState<any[]>([]);

  useEffect(() => {
    loadInitial();

    const channel = supabase
      .channel("chat")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "chat_messages" }, (payload) => {
        setMessages((prev) => [payload.new, ...prev].slice(0, 8));
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const loadInitial = async () => {
    const { data } = await supabase
      .from("chat_messages")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(8);

    if (data) setMessages(data);
  };

  return (
    <div className="glass-strong rounded-2xl p-4 max-w-md mx-auto">
      <div className="text-xs flex items-center gap-2 mb-2">
        <Flame className="w-4 h-4 text-primary" />
        실시간 활동
      </div>

      <div className="space-y-2 text-xs">
        {messages.map((m, i) => (
          <div key={i} className="bg-muted/40 px-3 py-2 rounded-lg">
            {m.message}
          </div>
        ))}
      </div>
    </div>
  );
}

/* =========================
   메인
========================= */

export default function Index() {
  const online = useOnline();
  const members = useMembers();

  const [total, setTotal] = useState(12858635494);
  const [today, setToday] = useState(40912630);
  const [vipLeft, setVipLeft] = useState(7);

  const smoothTotal = useSmoothCounter(total);
  const smoothToday = useSmoothCounter(today);

  /* 🔥 숫자 계속 증가 */
  useEffect(() => {
    const t = setInterval(() => {
      setTotal((v) => v + Math.floor(Math.random() * 5000));
      setToday((v) => v + Math.floor(Math.random() * 2000));
    }, 2000);

    return () => clearInterval(t);
  }, []);

  /* 🔥 VIP 압박 */
  useEffect(() => {
    const t = setInterval(() => {
      setVipLeft((v) => (v > 1 ? v - 1 : v));
    }, 15000);

    return () => clearInterval(t);
  }, []);

  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      {/* ✅ 고급 배경 */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(255,80,0,0.15),transparent_40%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_60%,rgba(0,200,255,0.15),transparent_40%)]" />
      <div className="absolute inset-0 backdrop-noise opacity-20" />

      <Particles density={30} />

      {/* 헤더 */}
      <header className="relative z-20">
        <div className="max-w-6xl mx-auto flex justify-between items-center h-16 px-4">
          <div className="font-bold">
            <span className="text-primary">PHONE</span>MISSION
          </div>

          <div className="flex gap-3">
            <Link to="/auth">로그인</Link>
            <Link to="/auth?signup=1" className="px-4 py-2 bg-primary text-white rounded-lg">
              시작하기
            </Link>
          </div>
        </div>
      </header>

      {/* HERO */}
      <section className="text-center pt-20 px-4">
        <h1 className="text-5xl font-black">
          폰 하나로 시작하는 <br />
          <span className="text-primary">스마트 수익 시스템</span>
        </h1>

        <p className="mt-4 text-muted-foreground">자동 미션 + 실시간 정산</p>

        {/* 카드 */}
        <div className="mt-10 flex justify-center">
          <div className="glass-strong p-6 rounded-xl w-full max-w-md">
            <div className="text-xs">누적 지급액</div>

            <div className="text-3xl text-primary font-bold mt-2">₩ {smoothTotal.toLocaleString()}</div>

            <div className="text-green-400 text-xs mt-1">+₩ {smoothToday.toLocaleString()} 오늘</div>

            <div className="text-xs mt-1">{online.toLocaleString()}명 접속중</div>
          </div>
        </div>

        {/* CTA */}
        <div className="mt-8">
          <Link to="/auth?signup=1" className="px-8 py-4 bg-primary text-white rounded-xl">
            무료 시작하기 →
          </Link>
        </div>

        {/* 🔥 채팅 */}
        <div className="mt-10">
          <LiveChat />
        </div>
      </section>

      {/* 🔥 VIP 압박 */}
      <section className="mt-20 text-center">
        <div className="max-w-md mx-auto glass-strong p-6 rounded-xl">
          <div className="text-xs text-yellow-400">EMPIRE 한정</div>

          <div className="text-2xl font-bold mt-2">남은 자리 {vipLeft}명</div>

          <div className="h-2 bg-muted mt-3 rounded-full">
            <div className="h-full bg-yellow-400" style={{ width: `${(7 - vipLeft) * 14}%` }} />
          </div>

          <Link to="/auth?signup=1" className="mt-4 inline-block px-6 py-3 bg-yellow-400 text-black rounded-lg">
            지금 입장
          </Link>
        </div>
      </section>

      {/* 하단 */}
      <section className="text-center mt-20 pb-20">
        <div className="text-3xl text-primary font-bold">{members.toLocaleString()}</div>
        <div className="text-sm text-muted-foreground">활성 사용자</div>
      </section>
    </div>
  );
}
