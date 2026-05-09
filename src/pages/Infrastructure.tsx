import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Brain, Layers, Globe2, ArrowRight, Sparkles, ArrowDown } from "lucide-react";
import Layout from "@/components/Layout";
import Disclaimer from "@/components/Disclaimer";
import { useTrackView } from "@/lib/telemetry";

const LAYERS = [
  {
    icon: Brain,
    tag: "L1",
    title: "Personal Memory Layer",
    desc: "당신의 결정·행동·선호가 개인 메모리에 누적됩니다.",
    en: "Personal.ai class · individual context engine",
    accent: "from-amber-300/30 via-amber-400/10 to-transparent",
    border: "border-amber-300/40",
  },
  {
    icon: Layers,
    tag: "L2",
    title: "Daily Optimization Layer",
    desc: "매일의 결정이 자동으로 최적화됩니다.",
    en: "Motion class · routing & scheduling intelligence",
    accent: "from-primary/30 via-primary/10 to-transparent",
    border: "border-primary/50",
  },
  {
    icon: Globe2,
    tag: "L3",
    title: "Global Learning Layer",
    desc: "전 세계 결정 데이터가 글로벌 인텔리전스로 통합됩니다.",
    en: "Planet-scale decision intelligence",
    accent: "from-orange-300/25 via-amber-200/10 to-transparent",
    border: "border-amber-200/40",
  },
];

export default function InfrastructurePage() {
  useTrackView("infrastructure_view");
  return (
    <Layout>
      <div className="relative container py-6 sm:py-12 space-y-12 max-w-5xl">
        {/* Ambient gold glow */}
        <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[700px] h-[700px] rounded-full bg-primary/10 blur-[140px]" />
        </div>

        <motion.header
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center space-y-3"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-primary/40 bg-primary/5">
            <Sparkles className="w-3 h-3 text-primary" />
            <span className="text-[10px] tracking-[0.3em] text-primary font-bold">PHONARA · INFRASTRUCTURE</span>
          </div>
          <h1 className="font-display font-black text-3xl sm:text-6xl leading-[1.05]">
            세계 AI 의사결정<br />
            <span className="text-gradient-imperial">인텔리전스 인프라</span>
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground max-w-2xl mx-auto">
            Phonara는 SaaS도 앱도 아닙니다. 인간의 매일 결정을 학습하고 최적화하는 <strong className="text-foreground">인프라 레이어</strong>입니다.
          </p>
        </motion.header>

        {/* 3-Layer stacked diagram */}
        <div className="relative">
          <div className="space-y-3">
            {LAYERS.map((l, i) => (
              <motion.div
                key={l.title}
                initial={{ opacity: 0, y: 24, rotateX: -8 }}
                whileInView={{ opacity: 1, y: 0, rotateX: 0 }}
                viewport={{ once: true, margin: "-80px" }}
                transition={{ duration: 0.7, delay: i * 0.15 }}
                style={{ perspective: 1000 }}
              >
                <div className={`group relative glass-strong rounded-3xl border ${l.border} overflow-hidden`}>
                  <div className={`absolute inset-0 bg-gradient-to-br ${l.accent} opacity-60 group-hover:opacity-100 transition-opacity`} />
                  <div className="relative p-5 sm:p-7 flex items-start gap-5">
                    <div className="shrink-0 w-14 h-14 rounded-2xl border border-primary/40 bg-background/60 flex items-center justify-center">
                      <l.icon className="w-7 h-7 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline gap-2">
                        <span className="text-[10px] tracking-widest text-primary font-bold">{l.tag}</span>
                        <h3 className="font-display font-black text-lg sm:text-2xl">{l.title}</h3>
                      </div>
                      <p className="text-sm text-foreground/80 mt-1">{l.desc}</p>
                      <p className="text-[11px] text-muted-foreground mt-1 italic">{l.en}</p>
                    </div>
                    <div className="hidden sm:flex flex-col items-end text-right shrink-0">
                      <span className="text-[10px] tracking-widest text-muted-foreground">DEPTH</span>
                      <span className="font-display font-black text-3xl text-primary tabular-nums">{i + 1}</span>
                    </div>
                  </div>
                </div>

                {i < LAYERS.length - 1 && (
                  <div className="flex justify-center py-1">
                    <motion.div
                      animate={{ y: [0, 6, 0], opacity: [0.4, 1, 0.4] }}
                      transition={{ duration: 1.6, repeat: Infinity, delay: i * 0.4 }}
                      className="text-primary/70"
                    >
                      <ArrowDown className="w-4 h-4" />
                    </motion.div>
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        </div>

        {/* Data flow stat strip */}
        <motion.div
          initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="grid grid-cols-3 gap-3 text-center"
        >
          {[
            { k: "Decisions/day", v: "∞" },
            { k: "Personal Memory", v: "∀ User" },
            { k: "Global Compound", v: "24/7" },
          ].map((s) => (
            <div key={s.k} className="rounded-2xl border border-border/40 bg-background/40 p-4">
              <div className="font-display font-black text-2xl sm:text-3xl text-primary">{s.v}</div>
              <div className="text-[10px] tracking-widest text-muted-foreground mt-1">{s.k}</div>
            </div>
          ))}
        </motion.div>

        <div className="flex flex-wrap items-center gap-3 justify-center">
          <Link to="/global-intelligence" className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-gradient-imperial text-primary-foreground font-bold glow-imperial">
            Trading Arena 시작하기 <ArrowRight className="w-4 h-4" />
          </Link>
          <Link to="/intelligence-loop" className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl border border-primary/40 text-foreground font-bold hover:bg-primary/5">
            Flywheel 보기
          </Link>
        </div>

        <Disclaimer />
      </div>
    </Layout>
  );
}
