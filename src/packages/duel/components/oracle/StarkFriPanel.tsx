/**
 * StarkFriPanel — zk-STARK FRI Folding 5단계 + R1CS Modular Addition Gate 회로도.
 * 모든 hash = HMAC 결정적 placeholder. transform/opacity 애니메이션만 사용.
 */
import { motion } from "framer-motion";

interface Props {
  hmacHex?: string;
  nonce?: number;
}

export function StarkFriPanel({ hmacHex = "", nonce = 0 }: Props) {
  const steps = 5;
  const layerHash = (i: number) =>
    "0x" + (hmacHex.slice(i * 8, i * 8 + 12) || "0000000000").padEnd(12, "0");

  return (
    <div className="space-y-2">
      <div className="rounded-xl p-3 bg-gradient-to-br from-[#1a0a14] to-[#0A0503] border border-pink-400/35">
        <div className="flex items-center justify-between">
          <div className="text-[10px] tracking-[0.28em] font-black uppercase text-pink-300/90">zk-STARK · FRI Folding</div>
          <div className="text-[9px] tracking-[0.22em] font-black uppercase text-amber-300/85">Post-Quantum · No Trusted Setup</div>
        </div>
        <p className="text-[11px] text-amber-200/85 mt-1 break-keep leading-snug">
          황실의 다항식이 반씩 접혀 내려가며 무결성을 증명합니다. 양자 시대에도 깨지지 않습니다.
        </p>
      </div>

      {/* FRI Folding visualization — 5 layers, each halves width */}
      <div className="rounded-xl p-3 bg-black/45 border border-amber-400/25">
        <div className="text-[10px] tracking-[0.24em] font-black uppercase text-amber-300/80 mb-2">FRI Layers · Round #{nonce}</div>
        <div className="space-y-1.5">
          {Array.from({ length: steps }).map((_, i) => {
            const widthPct = 100 / Math.pow(1.55, i);
            const isPink = i % 2 === 1;
            return (
              <motion.div
                key={i}
                className="flex items-center gap-2"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.08 * i, duration: 0.3 }}
              >
                <span className="text-[9px] font-black tabular-nums text-amber-300/75 w-7">L{i}</span>
                <div className="flex-1 relative h-4">
                  <motion.div
                    className="absolute inset-y-0 left-0 rounded-md"
                    style={{
                      width: `${widthPct}%`,
                      background: isPink
                        ? "linear-gradient(90deg,#F472B6,#EC4899 60%,transparent)"
                        : "linear-gradient(90deg,#F5C518,#FFD86B 60%,transparent)",
                      boxShadow: isPink
                        ? "0 0 12px hsl(330 90% 60% / 0.55)"
                        : "0 0 12px hsl(38 92% 60% / 0.55)",
                    }}
                    initial={{ scaleX: 0, transformOrigin: "left" }}
                    animate={{ scaleX: 1 }}
                    transition={{ delay: 0.15 + 0.08 * i, duration: 0.55, ease: "easeOut" }}
                  />
                  {/* fold ticks */}
                  {Array.from({ length: Math.max(1, Math.floor(8 / (i + 1))) }).map((_, j) => (
                    <span
                      key={j}
                      aria-hidden
                      className="absolute inset-y-0 w-px bg-black/55"
                      style={{ left: `${(j + 0.5) * (widthPct / Math.max(1, Math.floor(8 / (i + 1))))}%` }}
                    />
                  ))}
                </div>
                <span className="font-mono text-[9.5px] text-amber-200/80 tabular-nums w-[110px] text-right">{layerHash(i)}</span>
              </motion.div>
            );
          })}
        </div>
        <div className="mt-2 flex items-center justify-between text-[10px] text-amber-300/80 tabular-nums">
          <span>Commitment Round</span><span>5 / 5 · Merkle root sealed</span>
        </div>
      </div>

      {/* R1CS Modular Addition Gate — 64-bit ripple carry */}
      <div className="rounded-xl p-3 bg-black/45 border border-amber-400/25">
        <div className="flex items-center justify-between mb-1.5">
          <div className="text-[10px] tracking-[0.24em] font-black uppercase text-amber-300/80">R1CS · 64-bit Modular Addition Gate</div>
          <div className="text-[9px] font-black tabular-nums text-pink-300/80">128 constraints</div>
        </div>
        <svg viewBox="0 0 320 92" className="w-full h-auto" aria-hidden>
          <defs>
            <linearGradient id="bus" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#F5C518" />
              <stop offset="100%" stopColor="#F472B6" />
            </linearGradient>
          </defs>
          {/* input A bus */}
          <rect x="4" y="14" width="312" height="3" fill="url(#bus)" opacity="0.65" />
          <text x="4" y="11" fontSize="8" fill="#F5C518" letterSpacing="2">A[0..63]</text>
          {/* input B bus */}
          <rect x="4" y="40" width="312" height="3" fill="url(#bus)" opacity="0.65" />
          <text x="4" y="37" fontSize="8" fill="#F5C518" letterSpacing="2">B[0..63]</text>

          {/* 8 ripple-carry FA cells */}
          {Array.from({ length: 8 }).map((_, i) => {
            const x = 12 + i * 38;
            return (
              <g key={i}>
                <motion.rect
                  x={x} y={50} width={28} height={22} rx={3}
                  fill="hsl(10 40% 10% / 0.9)"
                  stroke={i % 2 === 0 ? "#F5C518" : "#F472B6"}
                  strokeOpacity="0.7"
                  strokeWidth="1.2"
                  initial={{ opacity: 0, y: 54 }}
                  animate={{ opacity: 1, y: 50 }}
                  transition={{ delay: 0.04 * i, duration: 0.25 }}
                />
                <text x={x + 14} y={64} textAnchor="middle" fontSize="8" fill="#FFE7AA" fontWeight="700">FA{i}</text>
                {/* carry line */}
                {i < 7 && (
                  <motion.line
                    x1={x + 28} y1={61} x2={x + 38} y2={61}
                    stroke="#F472B6" strokeWidth="1.3"
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ delay: 0.05 + 0.04 * i, duration: 0.3 }}
                  />
                )}
                {/* drop sum down */}
                <motion.line
                  x1={x + 14} y1={72} x2={x + 14} y2={86}
                  stroke="#F5C518" strokeWidth="1.3"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ delay: 0.07 + 0.04 * i, duration: 0.28 }}
                />
              </g>
            );
          })}
          {/* output bus */}
          <rect x="4" y="86" width="312" height="3" fill="url(#bus)" opacity="0.85" />
          <text x="280" y="84" fontSize="8" fill="#F472B6" letterSpacing="2">S = (A+B) mod 2⁶⁴</text>
        </svg>
        <div className="grid grid-cols-3 gap-1.5 mt-2 text-[10px] tabular-nums">
          <Stat k="Witness" v="194" />
          <Stat k="Public" v="4" />
          <Stat k="Degree" v="2" />
        </div>
      </div>

      <p className="text-[10.5px] text-amber-300/75 break-keep leading-snug">
        SHA-512 압축 함수의 64-bit modular addition 게이트를 R1CS 로 풀어낸 단면입니다. 모든 캐리는 in-circuit 으로 강제되며, FRI folding 으로 다시 봉인됩니다.
      </p>
    </div>
  );
}

function Stat({ k, v }: { k: string; v: string }) {
  return (
    <div className="rounded-md px-2 py-1 bg-black/55 border border-amber-400/20">
      <div className="text-[8.5px] tracking-[0.2em] font-black uppercase text-amber-300/70">{k}</div>
      <div className="font-mono text-amber-100/90">{v}</div>
    </div>
  );
}

export default StarkFriPanel;
