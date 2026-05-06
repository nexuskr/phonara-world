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
      {/* Background */}
      <div className="absolute inset-0 bg-grid opacity-40 pointer-events-none" />
      <div className="absolute -top-40 -left-40 w-[500px] h-[500px] rounded-full bg-primary/30 blur-3xl" />
      <div className="absolute top-40 -right-40 w-[600px] h-[600px] rounded-full bg-accent/30 blur-3xl" />
      <Particles density={70} />

      {/* Header */}
      <header className="sticky top-0 backdrop-blur bg-background/60 z-30">
        <div className="container flex items-center justify-between h-20">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-primary flex items-center justify-center font-bold text-white">
              폰
            </div>
            <span className="font-bold text-xl">
              <span className="text-gradient-primary">PHONE</span>MISSION
            </span>
          </div>

          <div className="flex items-center gap-3">
            <Link to="/auth" className="text-sm text-muted-foreground hidden sm:block">
              로그인
            </Link>
            <Link
              to="/auth?signup=1"
              className="px-5 py-2 rounded-full text-sm font-semibold bg-gradient-primary text-white"
            >
              무료 시작
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="container pt-12 pb-24 text-center">
        <h1 className="font-black text-3xl sm:text-6xl leading-tight">
          폰 하나로 시작하는
          <br />
          <span className="text-gradient-cyber">간단한 리워드 적립</span>
        </h1>

        <p className="mt-6 text-muted-foreground max-w-xl mx-auto">
          간단한 미션 참여로 포인트를 적립하고 보상을 받아보세요.
        </p>

        {/* Stats Card */}
        <div className="mt-10 p-6 rounded-2xl glass max-w-md mx-auto">
          <div className="text-xs text-muted-foreground">누적 지급액</div>

          <div className="text-3xl font-bold mt-2">₩ {total ? total.toLocaleString() : "불러오는 중..."}</div>

          <div className="text-xs mt-2 text-green-400">오늘 지급: ₩ {today ? today.toLocaleString() : "..."}</div>

          <div className="text-xs mt-2 text-muted-foreground">
            현재 {online ? online.toLocaleString() : "..."}명 이용 중
          </div>

          <div className="text-[10px] text-muted-foreground mt-1">* 최근 30일 기준</div>
        </div>

        {/* CTA */}
        <div className="mt-10">
          <Link
            to="/auth?signup=1"
            className="px-8 py-4 rounded-xl bg-gradient-primary text-white font-bold inline-flex items-center gap-2"
          >
            <Sparkles className="w-4 h-4" />
            무료로 시작하고 보상 받기
          </Link>

          <div className="text-[11px] text-muted-foreground mt-2">
            ✔ 가입 무료 · 언제든 탈퇴 가능 · 숨겨진 비용 없음
          </div>
        </div>
      </section>

      {/* Trust */}
      <section className="container text-center py-10">
        <div className="text-xl font-bold">{members?.toLocaleString()}명이 이용 중</div>
      </section>

      {/* Testimonials */}
      <section className="container py-12">
        <div className="grid md:grid-cols-3 gap-4">
          {["3일 만에 12,000원 적립했어요", "꾸준히 하면 쏠쏠해요", "부담 없이 사용 가능해서 좋아요"].map((t, i) => (
            <div key={i} className="p-4 glass rounded-xl text-sm">
              {t}
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="container py-12">
        <div className="grid md:grid-cols-3 gap-4">
          <div className="p-5 glass rounded-xl">
            <Cpu />
            <h3 className="font-bold mt-2">맞춤 미션</h3>
            <p className="text-sm text-muted-foreground">사용자 맞춤 추천</p>
          </div>

          <div className="p-5 glass rounded-xl">
            <TrendingUp />
            <h3 className="font-bold mt-2">추가 보상</h3>
            <p className="text-sm text-muted-foreground">프리미엄 기능 제공</p>
          </div>

          <div className="p-5 glass rounded-xl">
            <Globe />
            <h3 className="font-bold mt-2">실시간 지급</h3>
            <p className="text-sm text-muted-foreground">즉시 적립</p>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="container pb-20 max-w-xl mx-auto text-left">
        <div className="space-y-4 text-sm">
          <div>
            <div className="font-bold">Q. 무료인가요?</div>
            <div className="text-muted-foreground">네, 기본 이용은 무료입니다.</div>
          </div>
          <div>
            <div className="font-bold">Q. 출금 가능한가요?</div>
            <div className="text-muted-foreground">조건 충족 시 가능합니다.</div>
          </div>
        </div>
      </section>

      {/* Footer CTA */}
      <section className="text-center pb-20">
        <Link to="/auth?signup=1" className="px-8 py-4 bg-gradient-primary text-white rounded-xl font-bold">
          무료로 시작하기
        </Link>
      </section>
    </div>
  );
}
