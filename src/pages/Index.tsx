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
  Activity,
  Heart,
} from "lucide-react";
import Particles from "@/components/Particles";
import PayoutTicker from "@/components/PayoutTicker";
import { useOnline, useTotalPayout, useTodayPayout, useMembers } from "@/components/LiveStats";
import { useEffect, useState } from "react";

export default function Index() {
  const online = useOnline();
  const total = useTotalPayout();
  const today = useTodayPayout();
  const members = useMembers();

  // 🔥 실시간 채팅
  const [chat, setChat] = useState(["방금 2,300P 적립됨", "출금 바로 되네요", "오늘 미션 난이도 낮음"]);

  useEffect(() => {
    const msgs = [
      "지금 들어왔는데 괜찮네",
      "추천 미션 계속 뜸",
      "방금 5,000P 적립",
      "출금 테스트 완료",
      "이거 꾸준히 하면 쏠쏠",
    ];

    const interval = setInterval(() => {
      setChat((prev) => [
        `${Math.floor(Math.random() * 90)}**: ${msgs[Math.floor(Math.random() * msgs.length)]}`,
        ...prev.slice(0, 5),
      ]);
    }, 4000);

    return () => clearInterval(interval);
  }, []);

  // 🔥 실시간 활동
  const [activity, setActivity] = useState(["김** 2,000P 적립", "이** 미션 완료"]);

  useEffect(() => {
    const acts = ["박** 출금 신청", "최** 1,200P 적립", "정** 미션 완료"];

    const interval = setInterval(() => {
      setActivity((prev) => [acts[Math.floor(Math.random() * acts.length)], ...prev.slice(0, 4)]);
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* BG */}
      <div className="absolute inset-0 bg-grid opacity-40 pointer-events-none" />
      <div className="absolute -top-40 -left-40 w-[500px] h-[500px] rounded-full bg-primary/30 blur-3xl animate-float" />
      <div className="absolute top-40 -right-40 w-[600px] h-[600px] rounded-full bg-accent/30 blur-3xl animate-float-slow" />
      <Particles density={70} />

      {/* HEADER */}
      <header className="sticky top-0 z-30 backdrop-blur bg-background/60">
        <div className="container flex items-center justify-between h-20">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-primary glow-primary flex items-center justify-center font-black text-white">
              폰
            </div>
            <span className="font-display font-bold text-xl">
              <span className="text-gradient-primary">PHONE</span>MISSION
            </span>
          </div>

          <div className="flex items-center gap-3">
            <Link to="/auth" className="text-sm text-muted-foreground hidden sm:block">
              로그인
            </Link>
            <Link
              to="/auth?signup=1"
              className="px-5 py-2 rounded-full text-sm font-semibold bg-gradient-primary text-white glow-primary hover:scale-105 transition"
            >
              무료 시작
            </Link>
          </div>
        </div>
      </header>

      {/* HERO */}
      <section className="container pt-14 pb-24 text-center relative z-10">
        <h1 className="font-display font-black text-4xl sm:text-6xl lg:text-7xl leading-tight">
          폰 하나로 시작하는
          <br />
          <span className="text-gradient-cyber animate-gradient">스마트 리워드 적립</span>
        </h1>

        <p className="mt-6 text-base sm:text-xl text-muted-foreground max-w-2xl mx-auto">
          간단한 미션 참여로 포인트를 적립하고 보상을 받아보세요.
        </p>

        {/* STATS */}
        <div className="mt-12 max-w-md mx-auto glass-strong rounded-3xl p-8 neon-border">
          <div className="text-xs text-muted-foreground">누적 지급액</div>
          <div className="text-4xl font-black mt-2 text-gradient-gold">₩ {total?.toLocaleString() ?? "0"}</div>

          <div className="text-xs mt-3 text-green-400">오늘 지급: ₩ {today?.toLocaleString() ?? "0"}</div>

          <div className="text-xs mt-2 text-muted-foreground">현재 {online?.toLocaleString() ?? "0"}명 이용 중</div>
        </div>

        {/* CTA */}
        <div className="mt-12">
          <Link
            to="/auth?signup=1"
            className="px-10 py-5 rounded-2xl font-bold text-lg bg-gradient-primary text-white glow-primary hover:scale-105 transition inline-flex items-center gap-2"
          >
            <Sparkles className="w-5 h-5" />
            무료로 시작하기
            <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </section>

      {/* LIVE CHAT */}
      <section className="container py-10">
        <div className="glass-strong rounded-3xl p-6 neon-border max-w-md mx-auto">
          <div className="text-xs text-muted-foreground mb-3">💬 실시간 채팅</div>

          <div className="space-y-2 text-sm max-h-40 overflow-y-auto">
            {chat.map((msg, i) => (
              <div key={i}>{msg}</div>
            ))}
          </div>
        </div>
      </section>

      {/* LIVE ACTIVITY */}
      <section className="container py-10">
        <div className="glass rounded-2xl p-5 max-w-md mx-auto">
          <div className="text-xs text-muted-foreground mb-2">🔥 실시간 활동</div>

          <div className="space-y-2 text-sm">
            {activity.map((a, i) => (
              <div key={i}>{a}</div>
            ))}
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section className="container py-16">
        <div className="grid md:grid-cols-3 gap-6">
          <div className="glass-strong rounded-3xl p-6 neon-border">
            <Cpu className="w-8 h-8 text-primary" />
            <h3 className="mt-4 font-bold text-xl">맞춤 미션 추천</h3>
            <p className="text-sm text-muted-foreground mt-2">사용자 맞춤 미션 제공</p>
          </div>

          <div className="glass-strong rounded-3xl p-6 neon-border">
            <TrendingUp className="w-8 h-8 text-primary" />
            <h3 className="mt-4 font-bold text-xl">추가 보상</h3>
            <p className="text-sm text-muted-foreground mt-2">꾸준한 참여로 보상 증가</p>
          </div>

          <div className="glass-strong rounded-3xl p-6 neon-border">
            <Globe className="w-8 h-8 text-primary" />
            <h3 className="mt-4 font-bold text-xl">실시간 지급</h3>
            <p className="text-sm text-muted-foreground mt-2">즉시 반영되는 보상</p>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <section className="text-center pb-24">
        <Link
          to="/auth?signup=1"
          className="px-10 py-5 rounded-2xl bg-gradient-primary text-white font-bold text-lg glow-primary hover:scale-105 transition"
        >
          무료로 시작하기
        </Link>
      </section>
    </div>
  );
}
