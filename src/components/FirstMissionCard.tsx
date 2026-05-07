import { Link } from "react-router-dom";
import { Target, ChevronRight, Sparkles } from "lucide-react";
import { useDB } from "@/lib/store";
import { useEffect, useState } from "react";

const SEEN_KEY = "phonara_first_mission_seen_v1";

/**
 * 신규 가입 24시간 동안만 노출되는 First Mission 카드.
 * D1 retention의 핵심.
 */
export default function FirstMissionCard() {
  const [db] = useDB();
  const user = db.user;
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setHidden(!!localStorage.getItem(SEEN_KEY));
  }, []);

  if (!user || hidden) return null;
  // 가입 24h 내인지: todayEarnings === 0 + level <= 1 (간이 휴리스틱)
  const isNew = (user.todayEarnings ?? 0) === 0 && (user.level ?? 1) <= 1;
  if (!isNew) return null;

  return (
    <div className="container mt-3">
      <Link
        to="/missions"
        onClick={() => {
          localStorage.setItem(SEEN_KEY, String(Date.now()));
          setHidden(true);
        }}
        className="relative block overflow-hidden rounded-2xl glass-strong neon-border p-4 press group"
      >
        <div className="absolute inset-0 bg-gradient-imperial opacity-[0.08] group-hover:opacity-[0.14] transition" />
        <div className="absolute -top-8 -right-8 w-32 h-32 bg-primary/30 rounded-full blur-3xl" />

        <div className="relative flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-imperial flex items-center justify-center glow-imperial shrink-0">
            <Target className="w-6 h-6 text-primary-foreground" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 mb-0.5">
              <Sparkles className="w-3 h-3 text-primary" />
              <span className="text-[10px] font-imperial tracking-[0.2em] text-primary">FIRST MISSION</span>
            </div>
            <p className="text-sm font-bold text-foreground leading-tight">
              첫 미션 완료하면 <span className="text-gradient-imperial">+3,000원</span>
            </p>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              60초 안에 끝납니다. 지금 시작하세요.
            </p>
          </div>
          <ChevronRight className="w-5 h-5 text-primary shrink-0" />
        </div>
      </Link>
    </div>
  );
}
