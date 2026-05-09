import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, Sparkles } from "lucide-react";
import Layout from "@/components/Layout";
import Disclaimer from "@/components/Disclaimer";
import { useTrackView } from "@/lib/telemetry";

const KO_LINES = [
  "Phonara는 SaaS가 아닙니다.",
  "앱이 아닙니다. 회사가 아닙니다.",
  "인간과 AI가 함께 매일 결정을 내리는 방식,",
  "그 자체에 들어가는 인프라 레이어입니다.",
  "제품은 데이터를 만들기 위해 존재하고,",
  "데이터는 더 나은 결정을 만들기 위해 존재합니다.",
  "그것이 Phonara가 시간이 갈수록 강해지는 이유입니다.",
];

const EN_LINES = [
  "Phonara is not a SaaS, an app, or a company.",
  "It is the infrastructure layer that enters",
  "the way humans and AI make decisions together —",
  "every day, everywhere.",
  "Products exist to generate data.",
  "Data exists to produce better decisions.",
  "That is why Phonara compounds over time.",
];

function ManifestoBlock({ title, lines, lang }: { title: string; lines: string[]; lang: "ko" | "en" }) {
  return (
    <motion.div
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-80px" }}
      variants={{ visible: { transition: { staggerChildren: 0.15 } } }}
      className="space-y-2"
    >
      <div className="flex items-center gap-2 mb-3">
        <span className="h-px flex-1 bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
        <span className="text-[10px] tracking-[0.4em] text-primary font-bold">{title}</span>
        <span className="h-px flex-1 bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
      </div>
      {lines.map((l, i) => (
        <motion.p
          key={i}
          variants={{
            hidden: { opacity: 0, y: 12 },
            visible: { opacity: 1, y: 0, transition: { duration: 0.7, ease: "easeOut" } },
          }}
          className={`leading-relaxed ${
            lang === "ko"
              ? i === 0
                ? "font-display font-black text-2xl sm:text-4xl text-foreground"
                : "text-base sm:text-lg text-foreground/85"
              : "italic text-sm sm:text-base text-muted-foreground"
          }`}
        >
          {l}
        </motion.p>
      ))}
    </motion.div>
  );
}

export default function VisionPage() {
  useTrackView("vision_view");
  return (
    <Layout>
      <div className="relative container py-6 sm:py-12 space-y-12 max-w-3xl">
        <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 2 }}
            className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[700px] h-[700px] rounded-full bg-primary/10 blur-[160px]"
          />
        </div>

        <motion.header
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }}
          className="text-center space-y-3"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-primary/40 bg-primary/5">
            <Sparkles className="w-3 h-3 text-primary" />
            <span className="text-[10px] tracking-[0.3em] text-primary font-bold">PHONARA · VISION</span>
          </div>
          <h1 className="font-display font-black text-3xl sm:text-6xl leading-[1.05]">
            제품을 만드는 게 아닙니다.<br />
            <span className="text-gradient-imperial">의사결정 구조에 들어갑니다.</span>
          </h1>
          <p className="italic text-sm text-muted-foreground">
            We are not building a product. We are entering the structure of decisions.
          </p>
        </motion.header>

        {/* Animated gold separator */}
        <motion.div
          initial={{ scaleX: 0 }} whileInView={{ scaleX: 1 }} viewport={{ once: true }}
          transition={{ duration: 1.2, ease: "easeOut" }}
          className="h-px bg-gradient-to-r from-transparent via-primary to-transparent origin-left"
        />

        <article className="space-y-10">
          <ManifestoBlock title="KO · 한국어" lines={KO_LINES} lang="ko" />
          <ManifestoBlock title="EN · ENGLISH" lines={EN_LINES} lang="en" />
        </article>

        {/* Compounding stat strip */}
        <motion.div
          initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="grid grid-cols-3 gap-3 text-center"
        >
          {[
            { k: "Layer", v: "L1·L2·L3" },
            { k: "Compound", v: "24/7" },
            { k: "Reach", v: "Planet" },
          ].map((s) => (
            <div key={s.k} className="rounded-2xl border border-primary/30 bg-background/40 p-4">
              <div className="font-display font-black text-xl sm:text-2xl text-primary">{s.v}</div>
              <div className="text-[10px] tracking-widest text-muted-foreground mt-1">{s.k}</div>
            </div>
          ))}
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="flex flex-wrap items-center gap-3 justify-center"
        >
          <Link to="/global-intelligence" className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-gradient-imperial text-primary-foreground font-bold glow-imperial">
            Trading Arena 시작하기 <ArrowRight className="w-4 h-4" />
          </Link>
          <Link to="/infrastructure" className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl border border-primary/40 text-foreground font-bold hover:bg-primary/5">
            Infrastructure 보기
          </Link>
        </motion.div>

        <Disclaimer />
      </div>
    </Layout>
  );
}
