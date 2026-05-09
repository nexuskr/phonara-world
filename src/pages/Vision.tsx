import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import Layout from "@/components/Layout";
import Disclaimer from "@/components/Disclaimer";
import { useTrackView } from "@/lib/telemetry";

export default function VisionPage() {
  useTrackView("vision_view");
  return (
    <Layout>
      <div className="container py-6 sm:py-10 space-y-8 max-w-3xl">
        <header>
          <p className="text-[10px] tracking-[0.3em] text-primary font-bold">PHONARA · VISION</p>
          <h1 className="font-display font-black text-3xl sm:text-5xl mt-2">
            제품을 만드는 게 아닙니다.<br />
            <span className="text-gradient-imperial">의사결정 구조에 들어갑니다.</span>
          </h1>
        </header>

        <article className="prose prose-invert max-w-none text-sm leading-relaxed text-muted-foreground space-y-4">
          <p>Phonara는 SaaS가 아닙니다. 앱이 아닙니다. 회사가 아닙니다.</p>
          <p>Phonara는 인간과 AI가 함께 매일 결정을 내리는 방식 그 자체에 들어가는 인프라 레이어입니다.</p>
          <p>제품은 데이터를 만들기 위해 존재하고, 데이터는 더 나은 결정을 만들기 위해 존재합니다. 그것이 Phonara가 시간이 갈수록 강해지는 이유입니다.</p>
          <hr className="border-border/40" />
          <p className="text-foreground"><em>Phonara is not a SaaS, an app, or a company.</em></p>
          <p>It is the infrastructure layer that enters the way humans and AI make decisions together — every day, everywhere.</p>
          <p>Products exist to generate data. Data exists to produce better decisions. That is why Phonara compounds over time.</p>
        </article>

        <Link to="/global-intelligence" className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-gradient-imperial text-primary-foreground font-bold glow-imperial">
          Trading Arena 시작하기 <ArrowRight className="w-4 h-4" />
        </Link>

        <Disclaimer />
      </div>
    </Layout>
  );
}
