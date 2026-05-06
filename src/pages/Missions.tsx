import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "@/components/Layout";
import { useDB, DEFAULT_MISSIONS, TIER_RANK, formatKRW, type Mission, type Tier } from "@/lib/store";
import { CheckCircle2, Sparkles, Lock, Crown, Upload, Gamepad2, X, Zap } from "lucide-react";
import { toast } from "@/hooks/use-toast";

const tierFilters: { key: Tier; label: string; color: string }[] = [
  { key: "NORMAL", label: "일반",  color: "text-secondary" },
  { key: "VIP",    label: "VIP",   color: "text-primary" },
  { key: "GOD",    label: "GOD",   color: "text-accent" },
  { key: "EMPIRE", label: "EMPIRE", color: "text-gold" },
];

export default function Missions() {
  const [db, setDb] = useDB();
  const nav = useNavigate();
  const [tierTab, setTierTab] = useState<Tier>("NORMAL");
  const [completing, setCompleting] = useState<string | null>(null);
  const [ugcOpen, setUgcOpen] = useState<Mission | null>(null);
  const [gameOpen, setGameOpen] = useState<Mission | null>(null);
  const [catTab, setCatTab] = useState<"전체" | "게임">("전체");

  if (!db.user) { nav("/auth"); return null; }
  const userTierRank = TIER_RANK[db.user.tier];

  const missions = [...DEFAULT_MISSIONS, ...db.customMissions];
  const list = missions.filter(m => m.tier === tierTab && (catTab === "전체" || m.category === catTab));

  function complete(m: Mission) {
    if (db.completedMissions.includes(m.id)) { toast({ title: "이미 완료한 미션입니다" }); return; }
    if (TIER_RANK[m.tier] > userTierRank) { toast({ title: "잠긴 미션", description: "패키지를 업그레이드하면 잠금이 해제됩니다." }); return; }
    if (m.game) { setGameOpen(m); return; }
    if (m.ugc) { setUgcOpen(m); return; }
    setCompleting(m.id);
    setTimeout(() => {
      setDb(d => ({
        ...d,
        completedMissions: [...d.completedMissions, m.id],
        user: d.user ? { ...d.user, balance: d.user.balance + m.reward, todayEarnings: d.user.todayEarnings + m.reward, xp: d.user.xp + Math.floor(m.reward / 100) } : null,
      }));
      setCompleting(null);
      toast({ title: `🎉 +${formatKRW(m.reward)} 적립`, description: `${m.title} 완료!` });
    }, 1500);
  }

  return (
    <Layout>
      <div className="container pt-6 pb-10">
        <div className="mb-5">
          <h1 className="font-display font-black text-2xl flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" /> <span className="text-gradient-primary">사이버 미션</span>
          </h1>
          <p className="text-xs text-muted-foreground mt-1">VIP 등급에 따라 차등 공개되는 실시간 보상 미션</p>
        </div>

        {/* Tier tabs */}
        <div className="grid grid-cols-4 gap-2 mb-5">
          {tierFilters.map(t => {
            const active = tierTab === t.key;
            const locked = TIER_RANK[t.key] > userTierRank;
            return (
              <button key={t.key} onClick={() => setTierTab(t.key)}
                className={`relative py-3 rounded-2xl text-xs font-display font-black transition ${active ? "bg-gradient-primary text-primary-foreground glow-primary" : "glass text-muted-foreground"}`}>
                {locked && <Lock className="absolute top-1.5 right-1.5 w-3 h-3 text-gold" />}
                {t.label}
              </button>
            );
          })}
        </div>

        {/* Category sub-tabs */}
        <div className="flex gap-2 mb-5">
          {(["전체", "게임"] as const).map(c => (
            <button key={c} onClick={() => setCatTab(c)}
              className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition ${catTab === c ? "bg-gradient-cyber text-primary-foreground" : "glass text-muted-foreground"}`}>
              {c === "게임" && <Gamepad2 className="w-3.5 h-3.5" />} {c}
            </button>
          ))}
        </div>
        {TIER_RANK[tierTab] > userTierRank && (
          <div className="glass-strong rounded-2xl p-5 neon-border mb-5 relative overflow-hidden">
            <div className="absolute -top-10 -right-10 w-32 h-32 rounded-full bg-gold/40 blur-3xl" />
            <div className="relative flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-gold flex items-center justify-center glow-gold">
                <Crown className="w-7 h-7 text-gold-foreground" />
              </div>
              <div className="flex-1">
                <div className="text-[10px] tracking-widest text-gold font-black">PREMIUM LOCKED</div>
                <div className="font-display font-bold text-sm mt-0.5">{tierFilters.find(t => t.key === tierTab)?.label} 등급 미션이 잠겨있어요</div>
                <div className="text-[10px] text-muted-foreground mt-0.5">VIP 패키지 가입 시 즉시 해제</div>
              </div>
              <button onClick={() => nav("/packages")} className="px-3 py-2 rounded-xl bg-gradient-gold text-gold-foreground text-xs font-bold glow-gold">업그레이드</button>
            </div>
          </div>
        )}

        <div className="grid sm:grid-cols-2 gap-3">
          {list.map(m => {
            const done = db.completedMissions.includes(m.id);
            const inProgress = completing === m.id;
            const locked = TIER_RANK[m.tier] > userTierRank;
            return (
              <div key={m.id} className={`glass-strong rounded-2xl p-4 neon-border tilt-card relative overflow-hidden ${locked ? "opacity-70" : ""}`}>
                <div className="absolute -top-10 -right-10 w-24 h-24 rounded-full bg-gradient-primary blur-2xl opacity-30" />
                {done && <div className="absolute inset-0 bg-secondary/10 backdrop-blur-sm flex items-center justify-center"><div className="flex items-center gap-2 text-secondary font-bold"><CheckCircle2 className="w-5 h-5" /> 완료</div></div>}
                {locked && (
                  <div className="absolute inset-0 bg-background/70 backdrop-blur-sm flex flex-col items-center justify-center gap-2 z-10">
                    <Lock className="w-7 h-7 text-gold" />
                    <div className="text-xs font-bold text-gold">{m.tier} 전용</div>
                    <button onClick={() => nav("/packages")} className="px-3 py-1.5 rounded-lg bg-gradient-gold text-gold-foreground text-[10px] font-bold">업그레이드</button>
                  </div>
                )}
                <div className="relative">
                  <div className="flex items-center justify-between text-[10px] mb-2">
                    <span className="px-2 py-0.5 rounded-full bg-primary/15 text-primary font-bold">{m.category}</span>
                    <div className="flex items-center gap-1">
                      {m.ugc && <span className="px-2 py-0.5 rounded-full bg-accent/20 text-accent font-bold">UGC</span>}
                      <span className={`px-2 py-0.5 rounded-full font-bold ${m.difficulty === "VIP" ? "bg-gold/20 text-gold" : m.difficulty === "HARD" ? "bg-accent/20 text-accent" : "bg-muted text-muted-foreground"}`}>{m.difficulty}</span>
                    </div>
                  </div>
                  <h3 className="font-bold text-sm leading-snug">{m.title}</h3>
                  <p className="text-[11px] text-muted-foreground mt-1">{m.desc}</p>
                  <div className="flex items-center justify-between mt-4">
                    <div>
                      <div className="font-display font-black text-xl text-gradient-gold">+{formatKRW(m.reward)}</div>
                      <div className="text-[10px] text-muted-foreground">소요 {m.duration}</div>
                    </div>
                    <button disabled={done || inProgress || locked} onClick={() => complete(m)}
                      className="px-4 py-2 rounded-xl bg-gradient-primary text-primary-foreground text-xs font-bold glow-primary disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105 transition">
                      {inProgress ? "진행 중..." : done ? "완료됨" : m.game ? "🎮 플레이" : m.ugc ? "제출하기" : "시작하기"}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
          {list.length === 0 && <div className="col-span-full glass rounded-2xl p-10 text-center text-sm text-muted-foreground">현재 노출되는 미션이 없습니다</div>}
        </div>
      </div>

      {ugcOpen && (
        <UGCModal mission={ugcOpen} onClose={() => setUgcOpen(null)} onSubmit={() => {
          setDb(d => ({
            ...d,
            completedMissions: [...d.completedMissions, ugcOpen.id],
            user: d.user ? { ...d.user, balance: d.user.balance + ugcOpen.reward, todayEarnings: d.user.todayEarnings + ugcOpen.reward, xp: d.user.xp + Math.floor(ugcOpen.reward / 100) } : null,
          }));
          toast({ title: "🤖 Gemini Vision 1차 검토 통과", description: `+${formatKRW(ugcOpen.reward)} · 관리자 큐 등록됨` });
          setUgcOpen(null);
        }} />
      )}

      {gameOpen && (
        <GameModal mission={gameOpen} onClose={() => setGameOpen(null)} onWin={(bonus) => {
          const reward = gameOpen.reward + bonus;
          setDb(d => ({
            ...d,
            completedMissions: [...d.completedMissions, gameOpen.id],
            user: d.user ? { ...d.user, balance: d.user.balance + reward, todayEarnings: d.user.todayEarnings + reward, xp: d.user.xp + Math.floor(reward / 100) } : null,
          }));
          toast({ title: `🎉 +${formatKRW(reward)} 적립`, description: `${gameOpen.title} 클리어!` });
          setGameOpen(null);
        }} />
      )}
    </Layout>
  );
}

function UGCModal({ mission, onClose, onSubmit }: { mission: Mission; onClose: () => void; onSubmit: () => void }) {
  const [file, setFile] = useState<string>();
  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-md flex items-end sm:items-center justify-center p-4">
      <div className="w-full max-w-md glass-strong rounded-3xl p-6 neon-border relative animate-fade-up">
        <h2 className="font-display font-black text-lg">UGC 제출 — {mission.title}</h2>
        <p className="text-[11px] text-muted-foreground mt-1">사진 또는 영상을 업로드하면 Gemini Vision이 1차 검토 후 관리자 큐에 등록됩니다.</p>
        <label className="mt-4 block">
          <div className="glass rounded-2xl p-6 border-2 border-dashed border-border hover:border-primary text-center cursor-pointer">
            {file ? <img src={file} className="max-h-40 mx-auto rounded-lg" alt="" /> : (
              <>
                <Upload className="w-7 h-7 mx-auto text-muted-foreground" />
                <div className="text-xs mt-2 font-bold">사진/영상 업로드</div>
              </>
            )}
          </div>
          <input type="file" accept="image/*,video/*" className="hidden" onChange={e => {
            const f = e.target.files?.[0]; if (!f) return;
            const r = new FileReader(); r.onload = () => setFile(r.result as string); r.readAsDataURL(f);
          }} />
        </label>
        <div className="grid grid-cols-2 gap-2 mt-4">
          <button onClick={onClose} className="py-3 rounded-xl glass text-sm font-bold">취소</button>
          <button onClick={onSubmit} disabled={!file} className="py-3 rounded-xl bg-gradient-primary text-primary-foreground text-sm font-bold glow-primary disabled:opacity-50">제출</button>
        </div>
      </div>
    </div>
  );
}

function GameModal({ mission, onClose, onWin }: { mission: Mission; onClose: () => void; onWin: (bonus: number) => void }) {
  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-md flex items-end sm:items-center justify-center p-4">
      <div className="w-full max-w-md glass-strong rounded-3xl p-6 neon-border relative animate-fade-up">
        <button onClick={onClose} className="absolute top-4 right-4 w-8 h-8 rounded-full bg-muted/40 flex items-center justify-center"><X className="w-4 h-4" /></button>
        <h2 className="font-display font-black text-lg flex items-center gap-2"><Gamepad2 className="w-5 h-5 text-primary" /> {mission.title}</h2>
        <p className="text-[11px] text-muted-foreground mt-1">{mission.desc}</p>
        <div className="mt-5">
          {mission.game === "tap" && <TapGame reward={mission.reward} onWin={onWin} />}
          {mission.game === "lucky" && <LuckyGame reward={mission.reward} onWin={onWin} />}
          {mission.game === "memory" && <MemoryGame onWin={() => onWin(0)} />}
        </div>
      </div>
    </div>
  );
}

function TapGame({ reward, onWin }: { reward: number; onWin: (bonus: number) => void }) {
  const [count, setCount] = useState(0);
  const [time, setTime] = useState(10);
  const [running, setRunning] = useState(false);
  useEffect(() => {
    if (!running) return;
    if (time <= 0) {
      const bonus = Math.min(count * 50, reward * 2);
      setRunning(false);
      setTimeout(() => onWin(bonus), 400);
      return;
    }
    const t = setTimeout(() => setTime(s => s - 1), 1000);
    return () => clearTimeout(t);
  }, [time, running]);
  return (
    <div className="text-center">
      <div className="font-display font-black text-5xl text-gradient-primary tabular-nums">{count}</div>
      <div className="text-xs text-muted-foreground mt-1">남은 시간 {time}초 · 보너스 +{formatKRW(Math.min(count * 50, reward * 2))}</div>
      <button
        onClick={() => { if (!running) { setRunning(true); setCount(0); setTime(10); } setCount(c => c + 1); }}
        className="mt-5 w-40 h-40 rounded-full bg-gradient-cyber text-primary-foreground font-display font-black text-xl glow-primary mx-auto block hover:scale-95 active:scale-90 transition">
        {running ? "TAP!" : "시작"}
      </button>
    </div>
  );
}

function LuckyGame({ reward, onWin }: { reward: number; onWin: (bonus: number) => void }) {
  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState<number | null>(null);
  function spin() {
    setSpinning(true);
    setTimeout(() => {
      const r = Math.floor(Math.random() * reward * 5);
      setResult(r);
      setSpinning(false);
    }, 1800);
  }
  return (
    <div className="text-center">
      <div className={`w-44 h-44 rounded-full bg-gradient-aurora mx-auto flex items-center justify-center relative overflow-hidden ${spinning ? "animate-spin-slow" : ""}`}>
        <div className="absolute inset-2 rounded-full bg-background flex items-center justify-center font-display font-black text-2xl">
          {result !== null ? `+${formatKRW(result)}` : "🎁"}
        </div>
      </div>
      {result === null ? (
        <button onClick={spin} disabled={spinning} className="mt-5 px-8 py-3 rounded-xl bg-gradient-primary text-primary-foreground font-bold glow-primary disabled:opacity-50">
          {spinning ? "돌리는 중..." : "휠 돌리기"}
        </button>
      ) : (
        <button onClick={() => onWin(result)} className="mt-5 px-8 py-3 rounded-xl bg-gradient-gold text-gold-foreground font-bold glow-gold">
          <Zap className="inline w-4 h-4" /> 보상 받기
        </button>
      )}
    </div>
  );
}

function MemoryGame({ onWin }: { onWin: () => void }) {
  const symbols = ["🚀","💎","⚡","🔥","🌌","👑"];
  const init = useRef(
    [...symbols, ...symbols].map((s, i) => ({ id: i, s, flipped: false, matched: false }))
      .sort(() => Math.random() - 0.5)
  );
  const [cards, setCards] = useState(init.current);
  const [pick, setPick] = useState<number[]>([]);
  function tap(i: number) {
    if (pick.length === 2 || cards[i].flipped) return;
    const next = cards.map((c, j) => j === i ? { ...c, flipped: true } : c);
    setCards(next);
    const np = [...pick, i];
    setPick(np);
    if (np.length === 2) {
      const [a, b] = np;
      if (next[a].s === next[b].s) {
        const matched = next.map((c, j) => (j === a || j === b) ? { ...c, matched: true } : c);
        setCards(matched); setPick([]);
        if (matched.every(c => c.matched)) setTimeout(onWin, 600);
      } else {
        setTimeout(() => {
          setCards(cards => cards.map((c, j) => (j === a || j === b) ? { ...c, flipped: false } : c));
          setPick([]);
        }, 700);
      }
    }
  }
  return (
    <div className="grid grid-cols-4 gap-2">
      {cards.map((c, i) => (
        <button key={c.id} onClick={() => tap(i)}
          className={`aspect-square rounded-xl text-3xl flex items-center justify-center font-bold transition ${c.flipped || c.matched ? "bg-gradient-cyber" : "glass"}`}>
          {c.flipped || c.matched ? c.s : "?"}
        </button>
      ))}
    </div>
  );
}
