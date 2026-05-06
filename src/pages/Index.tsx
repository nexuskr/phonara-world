import { Link } from "react-router-dom";
import {
  ShieldCheck,
  Zap,
  Lock,
  Sparkles,
  ArrowRight,
  TrendingUp,
  Globe,
  Cpu,
  Users,
  Heart,
  Flame,
} from "lucide-react";

import { useEffect, useState } from "react";
import Particles from "@/components/Particles";
import PayoutTicker from "@/components/PayoutTicker";
import { useOnline, useTotalPayout, useTodayPayout, useMembers } from "@/components/LiveStats";

/* =========================
   실시간 채팅 (자연형)
========================= */

const names = ["민준", "서연", "지훈", "유진", "도윤", "하은", "태현", "지민"];

const actions = ["미션 완료", "포인트 적립", "출금 완료", "VIP 달성"];

function generateMessage() {
  const name = names[Math.floor(Math.random() * names.length)];
  const action = actions[Math.floor(Math.random() * actions.length)];
  const amount = Math.floor(Math.random() * 50000 + 1000);

  return `${name}님 ${action} (+₩${amount.toLocaleString()})`;
}

function LiveChat() {
  const [messages, setMessages] = useState<string[]>([]);

  useEffect(() => {
    const interval = setInterval(() => {
      setMessages((prev) => {
        const newMsg = generateMessage();
        const next = [newMsg, ...prev];
        return next.slice(0, 7);
      });
    }, 1800);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="glass-strong rounded-3xl p-5 neon-border w-full max-w-md mx-auto">
      <div className="text-xs text-muted-foreground mb-3 flex items-center gap-2">
        <Flame className="w-4 h-4 text-primary" /> 실시간 활동
      </div>

      <div className="space-y-2 text-sm">
        {messages.map((m, i) => (
          <div key={i} className="px-3 py-2 rounded-lg bg-muted/40 animate-fade-in">
            {m}
          </div>
        ))}
      </div>
    </div>
  );
}

/* =========================
   메인 페이지
========================= */

export default function Index() {
  const online = useOnline();
  const total = useTotalPayout();
  const today = useTodayPayout();
  const members = useMembers();

  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      {/* 배경 */}
      <div className="absolute inset-0 bg-grid opacity-40" />
      <Particles density={60} />

      {/* 헤더 */}
      <header className="relative z-20 border-b border-border/30">
        <div className="max-w-6xl mx-auto flex items-center justify-between h-16 px-4">
          <div className="font-bold text-lg">
            <span className="text-primary">PHONE</span>MISSION
          </div>

          <div className="flex gap-3">
            <Link to="/auth" className="text-sm">
              로그인
            </Link>
            <Link to="/auth?signup=1" className="px-4 py-2 rounded-xl bg-primary text-white text-sm">
              시작하기
            </Link>
          </div>
        </div>
      </header>

      {/* HERO */}
      <section className="relative z-10 max-w-6xl mx-auto px-4 pt-16 pb-24 text-center">
        <h1 className="text-4xl sm:text-6xl font-black leading-tight">
          폰 하나로 시작하는
          <br />
          <span className="text-primary">스마트 수익 시스템</span>
        </h1>

        <p className="mt-6 text-muted-foreground">자동 미션 + 실시간 정산으로 수익을 만드세요</p>

        {/* 카드 */}
        <div className="mt-10 flex justify-center">
          <div className="glass-strong rounded-2xl p-6 w-full max-w-md">
            <div className="text-xs text-muted-foreground">누적 지급액</div>

            <div className="text-3xl font-bold mt-2 text-primary">₩ {total.toLocaleString()}</div>

            <div className="text-xs text-green-400 mt-1">+₩ {today.toLocaleString()} 오늘 지급</div>

            <div className="text-xs mt-1 text-muted-foreground">{online.toLocaleString()}명 접속 중</div>
          </div>
        </div>

        {/* 버튼 */}
        <div className="mt-8">
          <Link
            to="/auth?signup=1"
            className="px-8 py-4 rounded-xl bg-primary text-white font-bold inline-flex items-center gap-2"
          >
            <Sparkles className="w-5 h-5" />
            무료 시작하기
            <ArrowRight className="w-5 h-5" />
          </Link>
        </div>

        {/* 채팅 */}
        <div className="mt-12 flex justify-center">
          <LiveChat />
        </div>
      </section>

      {/* 기능 */}
      <section className="relative z-10 max-w-6xl mx-auto px-4 pb-20">
        <div className="grid md:grid-cols-3 gap-4">
          <div className="glass p-5 rounded-xl text-center">
            <Cpu className="mx-auto mb-2" />
            AI 자동 미션
          </div>

          <div className="glass p-5 rounded-xl text-center">
            <TrendingUp className="mx-auto mb-2" />
            수익 증가 시스템
          </div>

          <div className="glass p-5 rounded-xl text-center">
            <Globe className="mx-auto mb-2" />
            실시간 글로벌 정산
          </div>
        </div>
      </section>

      {/* 통계 */}
      <section className="relative z-10 max-w-6xl mx-auto px-4 pb-24 text-center">
        <div className="text-3xl font-bold text-primary">{members.toLocaleString()}</div>
        <div className="text-sm text-muted-foreground">활성 사용자</div>
      </section>

      {/* CTA */}
      <section className="text-center pb-20">
        <h2 className="text-3xl font-bold">지금 시작하세요</h2>

        <Link to="/auth?signup=1" className="mt-6 inline-block px-10 py-4 bg-primary text-white rounded-xl">
          무료 시작
        </Link>
      </section>
    </div>
  );
}
