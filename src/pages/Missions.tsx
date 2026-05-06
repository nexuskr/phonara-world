import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "@/components/Layout";
import { useDB, DEFAULT_MISSIONS, TIER_RANK, formatKRW, type Mission, type Tier } from "@/lib/store";
import { CheckCircle2, Sparkles, Lock, Crown, Upload } from "lucide-react";
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

  if (!db.user) { nav("/auth"); return null; }
  const userTierRank = TIER_RANK[db.user.tier];

  const missions = [...DEFAULT_MISSIONS, ...db.customMissions];
  const list = missions.filter(m => m.tier === tierTab);

  function complete(m: Mission) {
    if (db.completedMissions.includes(m.id)) { toast({ title: "이미 완료한 미션입니다" }); return; }
    if (TIER_RANK[m.tier] > userTierRank) { toast({ title: "잠긴 미션", description: "패키지를 업그레이드하면 잠금이 해제됩니다." }); return; }
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

        {/* Locked banner */}
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
                      {inProgress ? "진행 중..." : done ? "완료됨" : m.ugc ? "제출하기" : "시작하기"}
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
