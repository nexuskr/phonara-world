/**
 * TradingEntryCard — Hero 바로 아래 핵심 베팅 진입 카드.
 * LONG/SHORT 둘 다 /arena 로 이동 (?side 쿼리).
 */
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { TrendingUp, TrendingDown, Zap } from "lucide-react";

export default function TradingEntryCard() {
  const navigate = useNavigate();
  return (
    <motion.div
      id="trading-entry-card"
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6 }}
      className="relative rounded-3xl border-2 border-gold/55 bg-card/70 backdrop-blur-xl p-5 md:p-7 overflow-hidden"
      style={{
        boxShadow: "0 0 44px hsl(var(--gold)/0.28), 0 0 84px hsl(var(--gold)/0.12), inset 0 1px 0 hsl(var(--gold)/0.28)",
      }}
    >
      <div aria-hidden className="absolute -top-20 -right-20 w-56 h-56 rounded-full bg-gold/15 blur-3xl" />
      <div aria-hidden className="absolute -bottom-20 -left-20 w-56 h-56 rounded-full bg-primary/15 blur-3xl" />

      <div className="relative flex items-center justify-center gap-2 mb-2">
        <Zap className="w-5 h-5 text-gold" />
        <h2 className="font-imperial font-black text-2xl md:text-3xl text-center">지금 바로 베팅</h2>
      </div>
      <p className="relative text-center text-sm md:text-base text-muted-foreground mb-6">
        LONG = 오르면 돈 / SHORT = 내리면 돈
      </p>

      <div className="relative grid grid-cols-2 gap-3 md:gap-4">
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={() => navigate("/arena?side=long")}
          className="h-20 md:h-24 rounded-2xl font-imperial font-black text-2xl md:text-3xl text-white relative overflow-hidden"
          style={{
            background: "linear-gradient(135deg, hsl(155 70% 40%) 0%, hsl(160 80% 45%) 100%)",
            boxShadow: "0 0 40px hsl(155 70% 50% / 0.45)",
          }}
        >
          <span className="relative z-10 inline-flex items-center gap-2">
            <TrendingUp className="w-7 h-7 md:w-8 md:h-8" />
            🚀 LONG
          </span>
        </motion.button>
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={() => navigate("/arena?side=short")}
          className="h-20 md:h-24 rounded-2xl font-imperial font-black text-2xl md:text-3xl text-white relative overflow-hidden"
          style={{
            background: "linear-gradient(135deg, hsl(0 75% 50%) 0%, hsl(15 85% 55%) 100%)",
            boxShadow: "0 0 40px hsl(0 75% 55% / 0.45)",
          }}
        >
          <span className="relative z-10 inline-flex items-center gap-2">
            <TrendingDown className="w-7 h-7 md:w-8 md:h-8" />
            💥 SHORT
          </span>
        </motion.button>
      </div>
    </motion.div>
  );
}
