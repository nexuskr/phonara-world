/**
 * /fairness — 황제의 공정한 승전보 가이드 (한글).
 * 4-step 시각화 + Client/Server Seed 설명 + 검증 코드 예시.
 */
import { useEffect } from "react";
import { Crown, ShieldCheck, KeyRound, Hash, RefreshCcw } from "lucide-react";
import { Link } from "react-router-dom";

const STEPS: Array<{ icon: typeof Crown; title: string; body: string }> = [
  {
    icon: KeyRound,
    title: "1. 서버가 미리 약속합니다",
    body: "전투 시작 전, 서버는 server_seed 의 SHA-256 해시(server_seed_hash)를 먼저 공개합니다. 이 시점 이후로는 서버도 결과를 바꿀 수 없습니다.",
  },
  {
    icon: Crown,
    title: "2. 폐하의 client_seed 가 더해집니다",
    body: "client_seed 는 언제든지 직접 변경 가능합니다. 서버 시드와 합쳐져 최종 RNG 시드가 만들어집니다 — 양측 모두 결과를 단독으로 조작할 수 없습니다.",
  },
  {
    icon: Hash,
    title: "3. 전투가 끝나면 server_seed 가 공개됩니다",
    body: "결과가 확정된 직후 서버가 server_seed 원본을 노출합니다. 이제 폐하는 직접 SHA-256 해싱 후 1단계의 해시와 일치하는지 확인할 수 있습니다.",
  },
  {
    icon: ShieldCheck,
    title: "4. 한 번의 클릭으로 검증",
    body: "전투 기록의 '검증' 버튼이 위 과정을 자동으로 실행합니다. 일치하면 ✓ 검증됨, 다르면 ⚠ 불일치가 표시됩니다.",
  },
];

const SAMPLE_CODE = `// 브라우저 콘솔에서 직접 검증할 수도 있습니다
const enc = new TextEncoder().encode(server_seed_revealed);
const digest = await crypto.subtle.digest("SHA-256", enc);
const hex = Array.from(new Uint8Array(digest))
  .map(b => b.toString(16).padStart(2, "0")).join("");
console.log(hex === server_seed_hash); // true 면 공정 확정`;

export default function Fairness() {
  useEffect(() => {
    document.title = "황제의 공정한 승전보 · Provably Fair";
  }, []);
  return (
    <main className="max-w-2xl mx-auto px-4 py-8 space-y-6">
      <header className="text-center space-y-2">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-emerald-400/40 bg-emerald-500/10 text-emerald-200 text-[11px] font-black tracking-[0.22em]">
          <ShieldCheck className="w-3.5 h-3.5" /> PROVABLY FAIR
        </div>
        <h1 className="font-display font-black text-3xl tracking-tight bg-gradient-to-r from-amber-300 via-amber-400 to-pink-500 bg-clip-text text-transparent">
          황제의 공정한 승전보
        </h1>
        <p className="text-sm text-muted-foreground leading-relaxed">
          모든 전투는 시작 전에 서버 시드를 약속하고, 끝난 직후 공개합니다.
          폐하는 누구의 도움 없이도 결과의 공정성을 직접 검증하실 수 있습니다.
        </p>
      </header>

      <section className="grid gap-3">
        {STEPS.map((s, i) => {
          const Icon = s.icon;
          return (
            <div
              key={i}
              className="rounded-2xl border border-border/40 bg-card/50 p-4 flex gap-3"
            >
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400/30 to-pink-500/30 flex items-center justify-center text-amber-200 shrink-0">
                <Icon className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h2 className="font-black text-sm">{s.title}</h2>
                <p className="text-xs text-muted-foreground leading-relaxed">{s.body}</p>
              </div>
            </div>
          );
        })}
      </section>

      <section className="rounded-2xl border border-border/40 bg-background/60 p-4 space-y-2">
        <div className="flex items-center gap-2 text-amber-300">
          <RefreshCcw className="w-4 h-4" />
          <span className="text-[11px] font-black tracking-[0.22em]">직접 검증하기</span>
        </div>
        <pre className="text-[11px] leading-relaxed overflow-x-auto rounded-lg bg-black/40 p-3 font-mono text-emerald-200">
{SAMPLE_CODE}
        </pre>
        <p className="text-[11px] text-muted-foreground leading-relaxed">
          전투 기록 시트의 <span className="font-black text-emerald-300">검증</span> 버튼이
          위 로직을 자동 실행합니다. 결과가 다르면 즉시 운영팀에 신고해 주세요.
        </p>
      </section>

      <div className="flex justify-center pt-2">
        <Link
          to="/games"
          className="px-5 py-3 rounded-2xl bg-gradient-to-r from-amber-400 to-pink-500 text-white font-black text-sm tracking-wide press shadow-lg shadow-pink-500/30"
        >
          <Crown className="w-4 h-4 inline mr-1.5" />
          전투장으로 돌아가기
        </Link>
      </div>
    </main>
  );
}
