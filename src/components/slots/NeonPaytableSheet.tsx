// NeonPaytableSheet — Cyberpunk neon (magenta / cyan / lime).
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { BookOpen, Zap } from "lucide-react";

interface SymRow { emoji: string; name: string; pay: string; }

const HIGH: SymRow[] = [
  { emoji: "🥷", name: "Neon Shogun",  pay: "5x: ×888 · 4x: ×222 · 3x: ×60" },
  { emoji: "🌸", name: "Cyber Geisha", pay: "5x: ×400 · 4x: ×120 · 3x: ×30" },
  { emoji: "⛩️", name: "Hologram Torii", pay: "5x: ×200 · 4x: ×60 · 3x: ×16" },
  { emoji: "🍱", name: "Bento Box",    pay: "5x: ×120 · 4x: ×40 · 3x: ×10" },
];

const LOW: SymRow[] = [
  { emoji: "A", name: "A", pay: "5x: ×40 · 4x: ×12 · 3x: ×4" },
  { emoji: "K", name: "K", pay: "5x: ×30 · 4x: ×10 · 3x: ×3" },
  { emoji: "Q", name: "Q", pay: "5x: ×24 · 4x: ×8 · 3x: ×2" },
  { emoji: "J", name: "J", pay: "5x: ×18 · 4x: ×6 · 3x: ×2" },
];

export default function NeonPaytableSheet() {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="border-pink-400/70 bg-fuchsia-950/40 text-pink-100 hover:bg-pink-900/50 hover:text-pink-50 backdrop-blur-sm"
          style={{ boxShadow: "0 0 12px rgba(244,114,182,0.35)" }}
        >
          <BookOpen className="h-4 w-4 mr-1.5" />
          배당표
        </Button>
      </SheetTrigger>
      <SheetContent
        side="right"
        className="w-full sm:max-w-md overflow-y-auto bg-gradient-to-b from-fuchsia-950 via-slate-950 to-cyan-950 border-l border-pink-400/40 text-pink-50"
      >
        <SheetHeader>
          <SheetTitle className="text-pink-100 flex items-center gap-2">
            <Zap className="h-5 w-5 text-cyan-300" style={{ filter: "drop-shadow(0 0 6px rgba(34,211,238,0.9))" }} />
            Neon Tokyo 88 — 배당표
          </SheetTitle>
        </SheetHeader>

        <div className="mt-5 space-y-5">
          <Section title="고배당 심볼" tone="magenta">
            {HIGH.map((s) => <Row key={s.name} {...s} />)}
          </Section>

          <Section title="저배당 심볼" tone="cyan">
            {LOW.map((s) => <Row key={s.name} {...s} />)}
          </Section>

          <Section title="특수 심볼" tone="lime">
            <Row emoji="✨" name="WILD (Hologram)" pay="모든 일반 심볼 대체. 보너스 트리거 외 모두 적용." />
            <Row emoji="💠" name="SCATTER" pay="3개 이상 등장 시 Hold88 보너스 발동." />
          </Section>

          <Section title="잭팟" tone="magenta">
            <p className="text-sm text-pink-100/90 leading-relaxed">
              <b className="text-lime-300">MAX WIN ×8,888</b> — 단일 스핀 최대 배율 도달 시{" "}
              <b className="text-cyan-300">Matrix Rain</b> + <b>Hacker</b> cinematic 발동.
            </p>
            <p className="text-xs text-pink-200/70 mt-2">
              RTP 96.0% (Real) · Demo 모드는 학습용으로 RTP가 다를 수 있습니다.
            </p>
          </Section>

          <p className="text-[11px] text-pink-200/60 text-center pt-2 pb-4">
            결과는 RNG로 결정되며, 실시간 통계는 서버 RPC가 권한합니다.
          </p>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function Section({
  title, tone, children,
}: { title: string; tone: "magenta" | "cyan" | "lime"; children: React.ReactNode }) {
  const cls = {
    magenta: "from-fuchsia-400/30 to-transparent border-fuchsia-400/50",
    cyan:    "from-cyan-400/25 to-transparent border-cyan-400/40",
    lime:    "from-lime-400/25 to-transparent border-lime-400/45",
  }[tone];
  return (
    <section className={`rounded-xl border bg-gradient-to-b ${cls} p-3`}>
      <h3 className="text-sm font-semibold text-pink-50 mb-2 tracking-wide">{title}</h3>
      <div className="space-y-1.5">{children}</div>
    </section>
  );
}

function Row({ emoji, name, pay }: SymRow) {
  return (
    <div className="flex items-start gap-3 rounded-lg bg-slate-950/50 px-2.5 py-2">
      <div className="w-8 h-8 shrink-0 rounded-md bg-fuchsia-900/50 flex items-center justify-center text-lg font-bold text-pink-50">
        {emoji}
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-medium text-pink-50 truncate">{name}</div>
        <div className="text-[11px] text-pink-100/80 leading-snug">{pay}</div>
      </div>
    </div>
  );
}
