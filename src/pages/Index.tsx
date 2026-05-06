import { Link } from "react-router-dom";
import { ShieldCheck, Zap, Lock, Sparkles, ArrowRight, TrendingUp, Globe, Cpu, Users, Heart } from "lucide-react";
import Particles from "@/components/Particles";
import PayoutTicker from "@/components/PayoutTicker";
import { useOnline, useTotalPayout, useTodayPayout, useMembers } from "@/components/LiveStats";

export default function Index() {
  const online = useOnline();
  const total = useTotalPayout();
  const today = useTodayPayout();
  const members = useMembers();

  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* BACKGROUND */}
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
        {/* BADGE */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full glass mb-8">
          <span className="w-2 h-2 bg-primary rounded-full animate-pulse" />
          <span className="text-xs text-muted-foreground">실시간 리워드 플랫폼 · 국내 사용자 증가 중</span>
        </div>

        {/* TITLE */}
        <h1 className="font-display font-black text-4xl sm:text-6xl lg:text-7xl leading-tight">
          폰 하나로 시작하는
          <br />
          <span className="text-gradient-cyber animate-gradient">스마트 리워드 적립</span>
        </h1>

        {/* SUB */}
        <p className="mt-6 text-base sm:text-xl text-muted-foreground max-w-2xl mx-auto">
          간단한 미션 참여와 활동으로 포인트를 적립하세요.
          <br className="hidden sm:block" />
          누구나 부담 없이 시작할 수 있는 리워드 플랫폼입니다.
        </p>

        {/* STATS CARD */}
        <div className="mt-12 max-w-md mx-auto relative">
          <div className="glass-strong rounded-3xl p-8 neon-border">
            <div className="text-xs text-muted-foreground">누적 지급액</div>

            <div className="text-4xl font-black mt-2 text-gradient-gold">₩ {total?.toLocaleString() ?? "0"}</div>

            <div className="text-xs mt-3 text-green-400">오늘 지급: ₩ {today?.toLocaleString() ?? "0"}</div>

            <div className="text-xs mt-2 text-muted-foreground">현재 {online?.toLocaleString() ?? "0"}명 이용 중</div>

            <div className="text-[10px] text-muted-foreground mt-2">* 최근 활동 기반 집계</div>
          </div>
        </div>

        {/* CTA */}
        <div className="mt-12 flex flex-col items-center gap-3">
          <Link
            to="/auth?signup=1"
            className="px-10 py-5 rounded-2xl font-bold text-lg bg-gradient-primary text-white glow-primary hover:scale-105 transition flex items-center gap-2"
          >
            <Sparkles className="w-5 h-5" />
            무료로 시작하고 보상 받기
            <ArrowRight className="w-5 h-5" />
          </Link>

          <div className="text-xs text-muted-foreground">✔ 가입 무료 · 숨겨진 비용 없음 · 언제든 중단 가능</div>
        </div>

        <div className="mt-4 text-xs text-secondary flex items-center justify-center gap-2">
          <Heart className="w-4 h-4 fill-secondary" />
          광고 없음 · 강제 결제 없음
        </div>
      </section>

      {/* LIVE */}
      <section className="container py-12">
        <PayoutTicker />
      </section>

      {/* FEATURES */}
      <section className="container py-16">
        <div className="grid md:grid-cols-3 gap-6">
          <div className="glass-strong rounded-3xl p-6 neon-border">
            <Cpu className="w-8 h-8 text-primary" />
            <h3 className="mt-4 font-bold text-xl">맞춤 미션 추천</h3>
            <p className="text-sm text-muted-foreground mt-2">사용자 활동 기반으로 적합한 미션을 제공합니다.</p>
          </div>

          <div className="glass-strong rounded-3xl p-6 neon-border">
            <TrendingUp className="w-8 h-8 text-primary" />
            <h3 className="mt-4 font-bold text-xl">추가 보상 시스템</h3>
            <p className="text-sm text-muted-foreground mt-2">꾸준한 참여로 더 높은 보상을 받을 수 있습니다.</p>
          </div>

          <div className="glass-strong rounded-3xl p-6 neon-border">
            <Globe className="w-8 h-8 text-primary" />
            <h3 className="mt-4 font-bold text-xl">실시간 지급</h3>
            <p className="text-sm text-muted-foreground mt-2">활동 결과에 따라 즉시 포인트가 반영됩니다.</p>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="container max-w-xl mx-auto pb-20">
        <div className="space-y-4 text-sm">
          <div>
            <div className="font-bold">Q. 무료인가요?</div>
            <div className="text-muted-foreground">네, 기본 기능은 무료로 이용 가능합니다.</div>
          </div>

          <div>
            <div className="font-bold">Q. 어떻게 적립되나요?</div>
            <div className="text-muted-foreground">미션 참여 및 활동에 따라 포인트가 지급됩니다.</div>
          </div>

          <div>
            <div className="font-bold">Q. 출금 가능한가요?</div>
            <div className="text-muted-foreground">일정 조건 충족 시 출금 가능합니다.</div>
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
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
