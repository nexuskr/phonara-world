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

export default function Index() {
  const online = useOnline();
  const total = useTotalPayout();
  const today = useTodayPayout();
  const members = useMembers();
  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* Backdrop layers */}
      <div className="absolute inset-0 bg-grid opacity-40 pointer-events-none" />
      <div className="absolute -top-40 -left-40 w-[500px] h-[500px] rounded-full bg-primary/30 blur-3xl animate-float" />
      <div className="absolute top-40 -right-40 w-[600px] h-[600px] rounded-full bg-accent/30 blur-3xl animate-float-slow" />
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] rounded-full bg-secondary/20 blur-3xl" />
      <Particles density={70} />

      {/* Top nav */}
      <header className="relative z-20">
        <div className="container flex items-center justify-between h-20">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-primary glow-primary flex items-center justify-center font-display font-black text-primary-foreground">
              폰
            </div>
            <span className="font-display font-bold text-xl tracking-wider">
              <span className="text-gradient-primary">PHONE</span>MISSION
            </span>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/auth" className="text-sm text-muted-foreground hover:text-foreground transition hidden sm:block">
              로그인
            </Link>
            <Link
              to="/auth?signup=1"
              className="px-4 sm:px-5 py-2 rounded-full text-xs sm:text-sm font-semibold bg-gradient-primary text-primary-foreground glow-primary hover:scale-105 transition"
            >
              지금 시작
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative z-10 container pt-10 pb-24 text-center">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full glass mb-8 animate-fade-up">
          <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
          <span className="text-xs text-muted-foreground">2026 한국 No.1 사이버 수익 플랫폼</span>
        </div>

        <h1 className="font-display font-black text-4xl sm:text-6xl lg:text-7xl leading-[1.05] tracking-tight animate-fade-up">
          폰 하나로 시작하는
          <br />
          <span className="text-gradient-cyber animate-gradient">진짜 사이버 수익</span>
        </h1>
        <p
          className="mt-6 text-base sm:text-xl text-muted-foreground max-w-2xl mx-auto animate-fade-up"
          style={{ animationDelay: "0.1s" }}
        >
          매일 폰이 돈을 버는 플랫폼. AI 미션, 데이터 보상, VIP 패키지로
          <br className="hidden sm:block" />
          24시간 자동 정산되는 사이버 자산을 만드세요.
        </p>

        {/* 3D floating earnings card */}
        <div className="mt-12 relative w-full max-w-md mx-auto animate-fade-up" style={{ animationDelay: "0.2s" }}>
          <div className="absolute inset-0 bg-gradient-cyber blur-3xl opacity-60 -z-10" />
          <div className="glass-strong rounded-3xl p-6 sm:p-8 neon-border relative overflow-hidden">
            <div className="absolute inset-0 bg-grid opacity-20" />
            <div className="relative">
              <div className="text-xs text-muted-foreground tracking-widest flex items-center justify-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-secondary animate-pulse" /> 실시간 누적 정산
              </div>
              <div className="font-display font-black text-4xl sm:text-5xl mt-2 text-gradient-gold tabular-nums">
                ₩ {total.toLocaleString()}
              </div>
              <div className="mt-3 flex items-center justify-center gap-2 text-xs text-secondary">
                <TrendingUp className="w-4 h-4" /> +₩ {today.toLocaleString()} 오늘 정산됨
              </div>
              <div className="mt-2 flex items-center justify-center gap-2 text-xs text-muted-foreground">
                <Users className="w-3.5 h-3.5 text-primary" /> 현재{" "}
                <span className="text-primary font-bold">{online.toLocaleString()}</span>명 접속중
              </div>
            </div>
            {/* floating orbs */}
            <div className="absolute -top-4 -right-4 w-16 h-16 rounded-full bg-gradient-primary blur-2xl opacity-60 animate-float" />
            <div className="absolute -bottom-4 -left-4 w-20 h-20 rounded-full bg-accent/60 blur-2xl animate-float-slow" />
          </div>
        </div>

        {/* CTA */}
        <div
          className="mt-12 flex flex-col sm:flex-row items-center justify-center gap-4 animate-fade-up"
          style={{ animationDelay: "0.3s" }}
        >
          <Link
            to="/auth?signup=1"
            className="group relative px-8 py-4 rounded-2xl font-display font-bold text-base sm:text-lg bg-gradient-primary text-primary-foreground glow-primary animate-pulse-glow hover:scale-105 transition flex items-center gap-2"
          >
            <Sparkles className="w-5 h-5" />
            시작하고 보상받기
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition" />
          </Link>
          <Link to="/auth" className="text-sm text-muted-foreground hover:text-foreground transition">
            이미 회원이신가요? →
          </Link>
        </div>

        <div
          className="mt-4 inline-flex items-center gap-2 px-4 py-1.5 rounded-full glass text-[11px] text-secondary animate-fade-up"
          style={{ animationDelay: "0.35s" }}
        >
          <Heart className="w-3.5 h-3.5 fill-secondary" /> FREE 플랜 평생 무료 · 결제 압박 0% · 광고 없음
        </div>

        {/* Trust badges */}
        <div
          className="mt-16 grid grid-cols-3 gap-3 sm:gap-6 max-w-2xl mx-auto animate-fade-up"
          style={{ animationDelay: "0.4s" }}
        >
          {[
            { icon: Lock, label: "256bit 암호화", sub: "금융급 보안" },
            { icon: ShieldCheck, label: "금융급 인증", sub: "ISO 27001" },
            { icon: Zap, label: "즉시 정산", sub: "24/7 자동" },
          ].map((b, i) => (
            <div
              key={i}
              className="glass rounded-2xl p-4 sm:p-5 tilt-card animate-float"
              style={{ animationDelay: `${i * 0.3}s` }}
            >
              <b.icon className="w-6 h-6 mx-auto text-primary" />
              <div className="mt-2 text-xs sm:text-sm font-bold">{b.label}</div>
              <div className="text-[10px] sm:text-xs text-muted-foreground">{b.sub}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Mega trust badge */}
      <section className="relative z-10 container -mt-4">
        <div className="glass-strong rounded-3xl p-6 sm:p-8 neon-border text-center relative overflow-hidden">
          <div
            className="absolute inset-0 bg-gradient-aurora opacity-10 animate-gradient"
            style={{ backgroundSize: "300% 300%" }}
          />
          <div className="relative">
            <div className="font-display font-black text-2xl sm:text-4xl">
              <span className="text-gradient-aurora animate-gradient">{members.toLocaleString()}</span>명이
              <br className="sm:hidden" /> 매일 돈을 벌고 있습니다
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground mt-2">
              2026년 한국 No.1 사이버 수익 플랫폼 · 금융위 보안 수준 · 평균 정산 12분
            </p>
          </div>
        </div>
      </section>

      {/* Live payout ticker */}
      <section className="relative z-10 container py-12">
        <div className="grid md:grid-cols-2 gap-5">
          <PayoutTicker />
          <div className="glass-strong rounded-3xl p-6 neon-border relative overflow-hidden">
            <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-gradient-gold blur-3xl opacity-50" />
            <div className="relative">
              <div className="text-[10px] text-gold tracking-widest font-black">EMPIRE COUNCIL · LIMITED</div>
              <h3 className="font-display font-black text-2xl mt-2 text-gradient-gold">선착순 20명 EMPIRE 오너</h3>
              <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
                플랫폼 전체 수익의 <span className="text-gold font-bold">10%를 매주 분배</span>받는 정식 오너십.
                Syndicate Crew, 무제한 출금, 평생 자산매니저.
              </p>
              <div className="mt-4">
                <div className="flex justify-between text-[10px] text-muted-foreground mb-1.5">
                  <span>잔여 좌석</span>
                  <span className="text-gold font-bold animate-pulse">단 7석 남음</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-gold glow-gold" style={{ width: "65%" }} />
                </div>
              </div>
              <Link
                to="/auth?signup=1"
                className="mt-5 inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-gradient-gold text-gold-foreground font-bold text-sm glow-gold"
              >
                <Sparkles className="w-4 h-4" /> EMPIRE 입성하기
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Social proof — testimonials */}
      <section className="relative z-10 container py-16">
        <div className="text-center mb-8">
          <h2 className="font-display font-black text-2xl sm:text-4xl">
            진짜 유저, <span className="text-gradient-cyber">진짜 정산</span>
          </h2>
          <p className="text-xs text-muted-foreground mt-2">
            TikTok · Instagram · 카카오 오픈채팅에서 매일 인증되는 후기
          </p>
        </div>
        <div className="grid md:grid-cols-3 gap-4">
          {[
            {
              name: "민지 (24·서울)",
              h: "월 320만원",
              t: "퇴근 후 1시간만 미션 돌렸는데 첫 달부터 130만원. VIP 가서 지금은 320 찍었어요.",
              tag: "@minji_cyber",
            },
            {
              name: "현우 (31·부산)",
              h: "GOD MODE 회원",
              t: "정산 진짜 12분 안에 들어옵니다. AI 봇이 미션 자동으로 돌려줘서 폰만 켜놓으면 끝.",
              tag: "@hyunwoo.god",
            },
            {
              name: "수아 (28·대전)",
              h: "Empire 오너",
              t: "Empire 오너십 받고 매주 분배금이 입금돼요. 진짜 노동 없이 자산이 굴러갑니다.",
              tag: "@sua.empire",
            },
            {
              name: "재훈 (22·인천)",
              h: "주 5회 출금",
              t: "출금 한 번도 막힌 적 없음. 친구 5명 추천했더니 보너스만 25만원 받았어요.",
              tag: "@jaehoon99",
            },
            {
              name: "지원 (35·광주)",
              h: "FREE만 9개월",
              t: "유료 안 가도 FREE 미션만으로도 한 달 80~120 나옴. 완전 부담 없어서 좋음.",
              tag: "@jiwon_free",
            },
            {
              name: "태리 (29·일산)",
              h: "Phantom 카운슬",
              t: "선착순 20명 안에 겨우 들어왔어요. 자산매니저가 실제로 1:1 케어 해줍니다.",
              tag: "@taeri.phantom",
            },
          ].map((r, i) => (
            <div key={i} className="glass rounded-2xl p-5 tilt-card">
              <div className="flex items-center justify-between">
                <div className="text-sm font-bold">{r.name}</div>
                <div className="text-[10px] px-2 py-0.5 rounded-full bg-primary/15 text-primary font-bold">{r.h}</div>
              </div>
              <p className="text-xs text-muted-foreground mt-2 leading-relaxed">"{r.t}"</p>
              <div className="text-[10px] text-secondary mt-3">{r.tag}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Feature row */}
      <section className="relative z-10 container py-16">
        <div className="grid md:grid-cols-3 gap-5">
          {[
            {
              icon: Cpu,
              title: "AI 자동 미션",
              desc: "당신의 폰이 24시간 일하는 자율 수익 엔진. AI가 매일 최적의 미션을 자동 분배합니다.",
              color: "primary",
            },
            {
              icon: TrendingUp,
              title: "VIP 패키지",
              desc: "Empire Founder부터 Phantom Council까지 — 일일 자동 정산 사이버 자산 패키지.",
              color: "accent",
            },
            {
              icon: Globe,
              title: "글로벌 라이브 정산",
              desc: "전 세계 데이터 보상이 실시간으로 입금됩니다. 즉시 출금 가능.",
              color: "secondary",
            },
          ].map((f, i) => (
            <div key={i} className="glass-strong rounded-3xl p-6 neon-border tilt-card relative overflow-hidden">
              <div
                className={`absolute -top-10 -right-10 w-32 h-32 rounded-full blur-3xl opacity-50`}
                style={{ background: `hsl(var(--${f.color}))` }}
              />
              <f.icon className="w-10 h-10 text-primary" />
              <h3 className="font-display font-bold text-xl mt-4">{f.title}</h3>
              <p className="text-sm text-muted-foreground mt-2 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Stats */}
      <section className="relative z-10 container py-16">
        <div className="glass-strong rounded-3xl p-8 sm:p-12 neon-border relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-cyber opacity-10" />
          <div className="relative grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            {[
              { v: members.toLocaleString(), k: "활성 회원" },
              { v: "₩ 128억+", k: "누적 정산" },
              { v: "99.97%", k: "정산 성공률" },
              { v: "4.9/5", k: "유저 만족도" },
            ].map((s, i) => (
              <div key={i}>
                <div className="font-display font-black text-2xl sm:text-4xl text-gradient-aurora animate-gradient tabular-nums">
                  {s.v}
                </div>
                <div className="text-xs text-muted-foreground mt-1">{s.k}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="relative z-10 container py-20 text-center">
        <h2 className="font-display font-black text-3xl sm:text-5xl">
          <span className="text-gradient-primary">지금</span>이 가장 빠른 시작입니다
        </h2>
        <p className="text-muted-foreground mt-3">단 1분이면 가입. 가입 즉시 5,000원 보너스 지급.</p>
        <Link
          to="/auth?signup=1"
          className="mt-8 inline-flex items-center gap-2 px-10 py-5 rounded-2xl font-display font-bold text-lg bg-gradient-primary text-primary-foreground glow-primary animate-pulse-glow hover:scale-105 transition"
        >
          <Sparkles className="w-5 h-5" /> 무료로 시작하기
        </Link>
        <div className="mt-12 text-xs text-muted-foreground">© 2026 PhoneMission. All Rights Reserved.</div>
      </section>
    </div>
  );
}
