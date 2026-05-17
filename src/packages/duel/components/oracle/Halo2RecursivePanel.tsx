/**
 * Halo2RecursivePanel — Pallas / Vesta 사이클 + Recursive Folding 시네마틱 시각화.
 * 모든 hash 는 HMAC 기반 결정적 placeholder.
 * transform/opacity only — 60fps 유지.
 */
import { motion } from "framer-motion";

interface Props {
  hmacHex?: string;
  nonce?: number;
  depth?: number; // 시각용 (1..4)
}

function shortHash(seed: string, len = 18): string {
  if (!seed) return "—";
  return "0x" + seed.slice(0, len);
}

export function Halo2RecursivePanel({ hmacHex = "", nonce = 0, depth = 3 }: Props) {
  const accumulator = shortHash(hmacHex.slice(8), 22);
  const pallasPt = shortHash(hmacHex.slice(0, 16), 14);
  const vestaPt = shortHash(hmacHex.slice(16, 32), 14);

  return (
    <div className="space-y-2">
      <div className="rounded-xl p-3 bg-gradient-to-br from-[#160a05] to-[#1a0a14] border border-amber-400/30">
        <div className="flex items-center justify-between">
          <div className="text-[10px] tracking-[0.28em] font-black uppercase text-amber-300/85">Halo2 Recursive Proof</div>
          <div className="text-[9px] tracking-[0.22em] font-black uppercase text-pink-300/85">Pallas ⇄ Vesta · No Trusted Setup</div>
        </div>
        <p className="text-[11px] text-amber-200/85 mt-1 break-keep leading-snug">
          황실은 매 라운드의 증명을 직전 증명 안으로 접어 넣습니다. 영원히 누적되어도 검증 비용은 일정합니다.
        </p>
      </div>

      {/* Pallas <-> Vesta cycle diagram */}
      <div className="rounded-xl p-3 bg-black/45 border border-amber-400/25">
        <svg viewBox="0 0 320 160" className="w-full h-auto" aria-hidden>
          <defs>
            <radialGradient id="pallas" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#F5C518" stopOpacity="0.95" />
              <stop offset="100%" stopColor="#7a4400" stopOpacity="0.2" />
            </radialGradient>
            <radialGradient id="vesta" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#F472B6" stopOpacity="0.95" />
              <stop offset="100%" stopColor="#5a1a3a" stopOpacity="0.2" />
            </radialGradient>
            <linearGradient id="cycle" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#F5C518" />
              <stop offset="100%" stopColor="#F472B6" />
            </linearGradient>
          </defs>

          {/* Pallas circle */}
          <circle cx="80" cy="80" r="42" fill="url(#pallas)" stroke="#F5C518" strokeOpacity="0.6" strokeWidth="1.5" />
          <text x="80" y="78" textAnchor="middle" fontSize="14" fontFamily="serif" fill="#FFF3C2" fontWeight="700">Pallas</text>
          <text x="80" y="94" textAnchor="middle" fontSize="9" fill="#F5C518" letterSpacing="2">SCALAR</text>

          {/* Vesta circle */}
          <circle cx="240" cy="80" r="42" fill="url(#vesta)" stroke="#F472B6" strokeOpacity="0.6" strokeWidth="1.5" />
          <text x="240" y="78" textAnchor="middle" fontSize="14" fontFamily="serif" fill="#FFD6E8" fontWeight="700">Vesta</text>
          <text x="240" y="94" textAnchor="middle" fontSize="9" fill="#F472B6" letterSpacing="2">BASE</text>

          {/* Cycle arrows */}
          <motion.path
            d="M 122 65 Q 160 30 198 65"
            stroke="url(#cycle)"
            strokeWidth="2"
            fill="none"
            strokeDasharray="6 4"
            initial={{ strokeDashoffset: 0 }}
            animate={{ strokeDashoffset: -200 }}
            transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
          />
          <motion.path
            d="M 198 95 Q 160 130 122 95"
            stroke="url(#cycle)"
            strokeWidth="2"
            fill="none"
            strokeDasharray="6 4"
            initial={{ strokeDashoffset: 0 }}
            animate={{ strokeDashoffset: 200 }}
            transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
          />
          <text x="160" y="28" textAnchor="middle" fontSize="9" fill="#F5C518" letterSpacing="2">accumulate(π₁)</text>
          <text x="160" y="148" textAnchor="middle" fontSize="9" fill="#F472B6" letterSpacing="2">verify · in-circuit</text>
        </svg>
      </div>

      {/* Recursive depth bars */}
      <div className="rounded-xl p-3 bg-black/40 border border-amber-400/20">
        <div className="text-[10px] tracking-[0.24em] font-black uppercase text-amber-300/80 mb-1.5">Recursion Depth · Round #{nonce}</div>
        <div className="space-y-1">
          {Array.from({ length: Math.max(1, depth) }).map((_, i) => (
            <motion.div
              key={i}
              className="h-2 rounded-full overflow-hidden bg-black/55"
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.05 * i, duration: 0.25 }}
            >
              <motion.div
                className="h-full"
                style={{
                  background: i % 2 === 0
                    ? "linear-gradient(90deg,#F5C518,#FFD86B)"
                    : "linear-gradient(90deg,#F472B6,#EC4899)",
                  width: `${100 - i * 14}%`,
                }}
                initial={{ scaleX: 0, transformOrigin: "left" }}
                animate={{ scaleX: 1 }}
                transition={{ duration: 0.6, delay: 0.1 + i * 0.08 }}
              />
            </motion.div>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-1.5 mt-3">
          <Tag k="Pallas Pt" v={pallasPt} />
          <Tag k="Vesta Pt" v={vestaPt} />
          <Tag k="Accumulator" v={accumulator} full />
        </div>
      </div>

      <p className="text-[10.5px] text-amber-300/75 break-keep leading-snug">
        시각화 placeholder — proof hash 는 동일 seed 입력 시 항상 동일하게 재현됩니다. Phase 3.5 에서 WASM verifier 가 도입되어 실제 Halo2 증명이 봉인됩니다.
      </p>
    </div>
  );
}

function Tag({ k, v, full }: { k: string; v: string; full?: boolean }) {
  return (
    <div className={`rounded-lg px-2 py-1 bg-black/55 border border-amber-400/20 ${full ? "col-span-2" : ""}`}>
      <div className="text-[8.5px] tracking-[0.2em] font-black uppercase text-amber-300/70">{k}</div>
      <div className="font-mono text-[10.5px] text-amber-100/90 truncate">{v}</div>
    </div>
  );
}

export default Halo2RecursivePanel;
