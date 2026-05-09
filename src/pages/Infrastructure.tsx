import { Link } from "react-router-dom";
import { Brain, Layers, Globe2, ArrowRight } from "lucide-react";
import Layout from "@/components/Layout";
import Disclaimer from "@/components/Disclaimer";
import { useTrackView } from "@/lib/telemetry";

const LAYERS = [
  { icon: Brain, title: "Personal Memory Layer",
    desc: "당신의 결정·행동·선호가 개인 메모리에 누적됩니다. (Personal.ai 급)" },
  { icon: Layers, title: "Daily Optimization Layer",
    desc: "매일의 결정이 자동으로 최적화됩니다. (Motion 급)" },
  { icon: Globe2, title: "Global Learning Layer",
    desc: "전 세계 결정 데이터가 글로벌 인텔리전스로 통합됩니다." },
];

export default function InfrastructurePage() {
  useTrackView("infrastructure_view");
  return (
    <Layout>
      <div className="container py-6 sm:py-10 space-y-8 max-w-4xl">
        <header>
          <p className="text-[10px] tracking-[0.3em] text-primary font-bold">PHONARA · INFRASTRUCTURE</p>
          <h1 className="font-display font-black text-3xl sm:text-5xl mt-2 leading-tight">
            세계 AI 의사결정<br />
            <span className="text-gradient-imperial">인텔리전스 인프라</span>
          </h1>
          <p className="text-sm text-muted-foreground mt-3 max-w-xl">
            Phonara는 SaaS도 앱도 아닙니다. 인간의 매일 결정을 학습하고 최적화하는 인프라 레이어입니다.
          </p>
        </header>

        <div className="grid sm:grid-cols-3 gap-4">
          {LAYERS.map((l) => (
            <div key={l.title} className="glass-strong rounded-3xl border border-primary/20 p-5">
              <l.icon className="w-7 h-7 text-primary" />
              <h3 className="font-display font-bold text-lg mt-3">{l.title}</h3>
              <p className="text-xs text-muted-foreground mt-2 leading-relaxed">{l.desc}</p>
            </div>
          ))}
        </div>

        <Link to="/global-intelligence" className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-gradient-imperial text-primary-foreground font-bold glow-imperial">
          Trading Arena 시작하기 <ArrowRight className="w-4 h-4" />
        </Link>

        <Disclaimer />
      </div>
    </Layout>
  );
}
