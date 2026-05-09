import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, Sparkles } from "lucide-react";
import Layout from "@/components/Layout";
import Disclaimer from "@/components/Disclaimer";
import { useTrackView } from "@/lib/telemetry";

const NODES = [
  "User Behavior",
  "Personal Memory",
  "Daily Optimization",
  "Long/Short Decision",
  "Global Learning",
  "Better Recommendations",
  "More Users",
];

export default function IntelligenceLoopPage() {
  useTrackView("intelligence_loop_view");
  const radius = 150;
  const size = 400;
  const cx = size / 2;
  const cy = size / 2;

  return (
    <Layout>
      <div className="relative container py-6 sm:py-12 space-y-10 max-w-5xl">
        <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
          <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[700px] h-[700px] rounded-full bg-primary/10 blur-[160px]" />
        </div>

        <motion.header
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}
          className="text-center space-y-3"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-primary/40 bg-primary/5">
            <Sparkles className="w-3 h-3 text-primary" />
            <span className="text-[10px] tracking-[0.3em] text-primary font-bold">INTELLIGENCE FLYWHEEL</span>
          </div>
          <h1 className="font-display font-black text-3xl sm:text-6xl leading-[1.05]">
            매일의 결정이 만드는<br />
            <span className="text-gradient-imperial">자기학습 루프</span>
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground max-w-2xl mx-auto">
            한 명의 결정이 더 나은 추천을 만들고, 더 나은 추천이 더 많은 결정을 부릅니다.
          </p>
        </motion.header>

        <div className="flex justify-center">
          <svg viewBox={`0 0 ${size} ${size}`} className="w-full max-w-xl">
            <defs>
              <linearGradient id="loopGold" x1="0" x2="1" y1="0" y2="1">
                <stop offset="0%" stopColor="hsl(45 88% 65%)" />
                <stop offset="100%" stopColor="hsl(40 80% 38%)" />
              </linearGradient>
              <radialGradient id="nodeGlow" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="hsl(45 88% 60%)" stopOpacity="0.6" />
                <stop offset="100%" stopColor="hsl(45 88% 60%)" stopOpacity="0" />
              </radialGradient>
              <filter id="goldBlur"><feGaussianBlur stdDeviation="3" /></filter>
            </defs>

            {/* Pulse rings */}
            {[0, 1, 2].map((i) => (
              <motion.circle
                key={i} cx={cx} cy={cy} r={radius}
                fill="none" stroke="hsl(45 88% 55%)" strokeWidth={1}
                initial={{ scale: 1, opacity: 0.4 }}
                animate={{ scale: 1.3, opacity: 0 }}
                transition={{ duration: 3.5, repeat: Infinity, delay: i * 1.16, ease: "easeOut" }}
                style={{ transformOrigin: `${cx}px ${cy}px` }}
              />
            ))}

            {/* Rotating dashed orbit */}
            <motion.circle
              cx={cx} cy={cy} r={radius}
              fill="none" stroke="url(#loopGold)" strokeWidth={1.5}
              strokeDasharray="4 8"
              animate={{ rotate: 360 }}
              transition={{ duration: 40, repeat: Infinity, ease: "linear" }}
              style={{ transformOrigin: `${cx}px ${cy}px` }}
            />

            {/* Connecting polygon */}
            <motion.polygon
              points={NODES.map((_, i) => {
                const a = (i / NODES.length) * Math.PI * 2 - Math.PI / 2;
                return `${cx + Math.cos(a) * radius},${cy + Math.sin(a) * radius}`;
              }).join(" ")}
              fill="hsl(45 88% 55% / 0.04)"
              stroke="hsl(45 88% 55% / 0.35)"
              strokeWidth={1}
              initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              transition={{ duration: 1, delay: 0.4 }}
            />

            {/* Traveling data particle */}
            <motion.circle
              r={4} fill="hsl(45 88% 70%)" filter="url(#goldBlur)"
              animate={{
                cx: NODES.map((_, i) => {
                  const a = (i / NODES.length) * Math.PI * 2 - Math.PI / 2;
                  return cx + Math.cos(a) * radius;
                }).concat([cx + Math.cos(-Math.PI / 2) * radius]),
                cy: NODES.map((_, i) => {
                  const a = (i / NODES.length) * Math.PI * 2 - Math.PI / 2;
                  return cy + Math.sin(a) * radius;
                }).concat([cy + Math.sin(-Math.PI / 2) * radius]),
              }}
              transition={{ duration: 7, repeat: Infinity, ease: "linear" }}
            />

            {/* Nodes */}
            {NODES.map((label, i) => {
              const angle = (i / NODES.length) * Math.PI * 2 - Math.PI / 2;
              const x = cx + Math.cos(angle) * radius;
              const y = cy + Math.sin(angle) * radius;
              const highlight = label === "Long/Short Decision";
              const isAbove = y < cy - 10;
              return (
                <g key={label}>
                  {highlight && <circle cx={x} cy={y} r={26} fill="url(#nodeGlow)" />}
                  <motion.circle
                    cx={x} cy={y} r={highlight ? 11 : 6}
                    fill={highlight ? "hsl(45 88% 60%)" : "hsl(0 0% 85%)"}
                    stroke={highlight ? "hsl(45 88% 80%)" : "transparent"}
                    strokeWidth={highlight ? 2 : 0}
                    initial={{ scale: 0 }} animate={{ scale: 1 }}
                    transition={{ delay: i * 0.1 + 0.3, type: "spring", stiffness: 240 }}
                  />
                  {highlight && (
                    <motion.circle
                      cx={x} cy={y} r={11}
                      fill="none" stroke="hsl(45 88% 60%)" strokeWidth={2}
                      animate={{ scale: [1, 1.8], opacity: [0.7, 0] }}
                      transition={{ duration: 1.6, repeat: Infinity }}
                      style={{ transformOrigin: `${x}px ${y}px` }}
                    />
                  )}
                  <motion.text
                    x={x}
                    y={y + (isAbove ? -20 : 22)}
                    textAnchor="middle"
                    fill={highlight ? "hsl(45 88% 65%)" : "currentColor"}
                    fontSize={highlight ? 13 : 11}
                    fontWeight={highlight ? 800 : 500}
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.1 + 0.5 }}
                  >
                    {label}
                  </motion.text>
                </g>
              );
            })}

            {/* Center label */}
            <text x={cx} y={cy - 4} textAnchor="middle" className="fill-current" fontSize={18} fontWeight={900}>
              PHONARA
            </text>
            <text x={cx} y={cy + 14} textAnchor="middle" fill="hsl(45 88% 55%)" fontSize={9} letterSpacing="3">
              FLYWHEEL
            </text>
          </svg>
        </div>

        {/* Nodes legend */}
        <div className="grid sm:grid-cols-3 lg:grid-cols-7 gap-2">
          {NODES.map((n, i) => {
            const highlight = n === "Long/Short Decision";
            return (
              <motion.div
                key={n}
                initial={{ opacity: 0, y: 8 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
                transition={{ delay: i * 0.04 }}
                className={`rounded-xl border px-3 py-2 text-[11px] text-center ${
                  highlight ? "border-primary/60 bg-primary/10 text-primary font-bold" : "border-border/40 bg-background/40 text-muted-foreground"
                }`}
              >
                {n}
              </motion.div>
            );
          })}
        </div>

        <div className="flex flex-wrap items-center gap-3 justify-center">
          <Link to="/global-intelligence" className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-gradient-imperial text-primary-foreground font-bold glow-imperial">
            Trading Arena 시작하기 <ArrowRight className="w-4 h-4" />
          </Link>
          <Link to="/vision" className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl border border-primary/40 text-foreground font-bold hover:bg-primary/5">
            Vision 보기
          </Link>
        </div>

        <Disclaimer />
      </div>
    </Layout>
  );
}
