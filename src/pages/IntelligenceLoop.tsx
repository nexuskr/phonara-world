import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
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
  const radius = 130;
  const cx = 180, cy = 180;
  return (
    <Layout>
      <div className="container py-6 sm:py-10 space-y-8 max-w-4xl">
        <header>
          <p className="text-[10px] tracking-[0.3em] text-primary font-bold">INTELLIGENCE FLYWHEEL</p>
          <h1 className="font-display font-black text-3xl sm:text-5xl mt-2">
            매일 결정이 만드는 <span className="text-gradient-imperial">자기학습 루프</span>
          </h1>
          <p className="text-sm text-muted-foreground mt-3">
            한 명의 결정이 더 나은 추천을 만들고, 더 나은 추천이 더 많은 결정을 부릅니다.
          </p>
        </header>

        <div className="flex justify-center">
          <svg viewBox="0 0 360 360" className="w-full max-w-md">
            <defs>
              <linearGradient id="goldStroke" x1="0" x2="1" y1="0" y2="1">
                <stop offset="0%" stopColor="hsl(45 88% 60%)" />
                <stop offset="100%" stopColor="hsl(45 88% 40%)" />
              </linearGradient>
            </defs>
            <motion.circle
              cx={cx} cy={cy} r={radius}
              fill="none" stroke="url(#goldStroke)" strokeWidth={1.5}
              strokeDasharray="4 6"
              animate={{ rotate: 360 }}
              transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
              style={{ transformOrigin: `${cx}px ${cy}px` }}
            />
            {NODES.map((label, i) => {
              const angle = (i / NODES.length) * Math.PI * 2 - Math.PI / 2;
              const x = cx + Math.cos(angle) * radius;
              const y = cy + Math.sin(angle) * radius;
              const highlight = label === "Long/Short Decision";
              return (
                <g key={label}>
                  <motion.circle
                    cx={x} cy={y} r={highlight ? 10 : 6}
                    fill={highlight ? "hsl(45 88% 55%)" : "hsl(0 0% 80%)"}
                    initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: i * 0.1 }}
                  />
                  <text
                    x={x} y={y - (highlight ? 18 : 14)}
                    textAnchor="middle"
                    fill={highlight ? "hsl(45 88% 60%)" : "currentColor"}
                    fontSize={highlight ? 11 : 10}
                    fontWeight={highlight ? 700 : 500}
                  >
                    {label}
                  </text>
                </g>
              );
            })}
            <text x={cx} y={cy} textAnchor="middle" className="fill-current" fontSize={14} fontWeight={800}>
              PHONARA
            </text>
            <text x={cx} y={cy + 16} textAnchor="middle" className="fill-current opacity-60" fontSize={9}>
              FLYWHEEL
            </text>
          </svg>
        </div>

        <Link to="/global-intelligence" className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-gradient-imperial text-primary-foreground font-bold glow-imperial">
          Trading Arena 시작하기 <ArrowRight className="w-4 h-4" />
        </Link>

        <Disclaimer />
      </div>
    </Layout>
  );
}
