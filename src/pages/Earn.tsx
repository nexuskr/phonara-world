import { Link } from "react-router-dom";
import Layout from "@/components/Layout";
import PhonaraNav from "@/components/nav/PhonaraNav";
import { useRequireAuth } from "@/hooks/use-require-auth";
import {
  CalendarCheck, Target, UserPlus, Sparkles, Share2, Gift,
} from "lucide-react";

/**
 * /earn — Earn Hub (Sprint 1에서 본격 RPC 연결).
 * Sprint 0: 5카드 셸 + 기존 페이지로 라우팅.
 */

const EARN_CARDS = [
  {
    to: "/missions?tab=daily",
    icon: CalendarCheck,
    title: "일일 출석",
    desc: "D1 100 → D7 1,500 보너스 포인트",
    cta: "오늘 출석",
    accent: "from-amber-500/20 to-yellow-500/5 border-amber-500/40",
  },
  {
    to: "/missions",
    icon: Target,
    title: "일일 미션",
    desc: "매일 5~7개 자동 갱신",
    cta: "미션 보러가기",
    accent: "from-emerald-500/20 to-teal-500/5 border-emerald-500/40",
  },
  {
    to: "/referral",
    icon: UserPlus,
    title: "친구 초대",
    desc: "가입 +200, 첫 입금 양쪽 +2~3k",
    cta: "초대 링크",
    accent: "from-pink-500/20 to-rose-500/5 border-pink-500/40",
  },
  {
    to: "/games",
    icon: Sparkles,
    title: "Play-to-Earn",
    desc: "누적 베팅 10k 마다 +100 보너스",
    cta: "게임하러 가기",
    accent: "from-violet-500/20 to-fuchsia-500/5 border-violet-500/40",
  },
  {
    to: "/missions?tab=rewards",
    icon: Share2,
    title: "공유 보상",
    desc: "빅윈 자동 이미지·영상 + 추가 PHON",
    cta: "공유하고 받기",
    accent: "from-blue-500/20 to-cyan-500/5 border-blue-500/40",
  },
];

export default function Earn() {
  const user = useRequireAuth();
  if (!user) return null;

  return (
    <Layout>
      <PhonaraNav />

      <div className="container py-5 space-y-5">
        <header className="flex items-end justify-between gap-3">
          <div>
            <div className="text-[11px] tracking-[0.3em] font-black text-primary/80 uppercase">
              💰 수익
            </div>
            <h1 className="font-imperial text-2xl md:text-3xl text-gradient-imperial mt-1">
              매일 무료로 돈 버는 곳
            </h1>
            <p className="text-xs text-muted-foreground mt-1">
              아래 5가지 다 하면 매일 평균 4,000~6,000 PHON 확보 가능.
            </p>
          </div>
          <Link
            to="/events"
            className="hidden md:inline-flex items-center gap-1.5 px-3 py-2 rounded-xl glass border border-primary/30 text-[11px] font-bold text-primary press"
          >
            <Gift className="w-3.5 h-3.5" />
            이벤트
          </Link>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {EARN_CARDS.map((c) => {
            const Icon = c.icon;
            return (
              <Link
                key={c.to + c.title}
                to={c.to}
                className={`group rounded-2xl border bg-gradient-to-br ${c.accent} p-4 press transition hover:border-primary/60`}
              >
                <div className="flex items-start gap-3">
                  <div className="shrink-0 w-10 h-10 rounded-xl glass border border-border/40 flex items-center justify-center text-primary">
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="font-imperial text-base text-foreground">{c.title}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">{c.desc}</div>
                  </div>
                </div>
                <div className="mt-3 inline-flex items-center gap-1 text-[11px] font-bold text-primary">
                  {c.cta} →
                </div>
              </Link>
            );
          })}
        </div>

        <div className="rounded-2xl border border-border/40 glass p-4 text-center">
          <div className="text-[10px] tracking-[0.3em] font-black text-muted-foreground uppercase">
            Sprint 1 예고
          </div>
          <div className="font-imperial text-sm text-foreground mt-1">
            다음 업데이트(Week 3): 출석·미션·초대 RPC 연결 + 자동 공유 카드 생성
          </div>
        </div>
      </div>
    </Layout>
  );
}
