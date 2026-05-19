/**
 * ImperialBlackjackTable — cinematic card table (DOM + framer-motion).
 * Cards animate stack → fan with slight rotation. Bust/Blackjack burst overlay.
 */
import { memo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { Card, Outcome } from "../types";
import { handValue } from "../types";

interface Props {
  player: Card[];
  dealer: Card[];
  dealerHidden: boolean;
  outcome: Outcome | null;
}

function CardFace({ card, hidden, index }: { card: Card; hidden?: boolean; index: number }) {
  const red = card.suit === "♥" || card.suit === "♦";
  return (
    <motion.div
      initial={{ x: -120, y: -60, rotate: -25, opacity: 0 }}
      animate={{ x: index * 28, y: 0, rotate: -6 + index * 4, opacity: 1 }}
      transition={{ type: "spring", stiffness: 220, damping: 22, delay: index * 0.07 }}
      className="absolute w-16 h-24 md:w-20 md:h-28 rounded-lg shadow-[0_8px_20px_-4px_hsla(0,0%,0%,0.6)]"
      style={{ left: 0, top: 0 }}
    >
      {hidden ? (
        <div className="w-full h-full rounded-lg bg-gradient-to-br from-[hsl(var(--gold))] to-[hsl(var(--pink))] border border-[hsl(var(--gold))]/70 flex items-center justify-center">
          <div className="w-8 h-8 rounded-full border-2 border-background/60" />
        </div>
      ) : (
        <div className="w-full h-full rounded-lg bg-white border border-[hsl(var(--gold))]/40 flex flex-col justify-between p-1.5">
          <div className={`text-sm font-black ${red ? "text-red-600" : "text-zinc-900"}`}>
            {card.rank}<div className="text-base leading-none">{card.suit}</div>
          </div>
          <div className={`text-sm font-black self-end rotate-180 ${red ? "text-red-600" : "text-zinc-900"}`}>
            {card.rank}<div className="text-base leading-none">{card.suit}</div>
          </div>
        </div>
      )}
    </motion.div>
  );
}

function Hand({ cards, hideFirst, label }: { cards: Card[]; hideFirst?: boolean; label: string }) {
  const visible = hideFirst ? cards.filter((_, i) => i !== 0).concat(cards[0] ? [cards[0]] : []) : cards;
  const total = handValue(hideFirst ? cards.slice(1) : cards).total;
  return (
    <div className="flex flex-col items-start gap-2">
      <div className="text-[11px] uppercase tracking-wider text-muted-foreground flex items-center gap-2">
        {label}
        <span className="text-[hsl(var(--gold))] font-bold tabular-nums">{hideFirst ? "?+" + total : total}</span>
      </div>
      <div className="relative h-28 md:h-32 w-44 md:w-56">
        {cards.map((c, i) => (
          <CardFace
            key={`${i}-${c.suit}-${c.rank}`}
            card={c}
            hidden={hideFirst && i === 0}
            index={i}
          />
        ))}
      </div>
    </div>
  );
}

function ImperialBlackjackTableImpl({ player, dealer, dealerHidden, outcome }: Props) {
  return (
    <div className="relative w-full aspect-[16/10] rounded-2xl overflow-hidden border border-[hsl(var(--gold))]/30 bg-gradient-to-b from-[hsl(150,55%,12%)] to-[hsl(260,50%,6%)] p-5 md:p-8">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,hsla(45,90%,60%,0.08),transparent_70%)]" />
      <div className="absolute inset-0 [background:repeating-linear-gradient(45deg,transparent_0,transparent_20px,hsla(45,90%,60%,0.02)_20px,hsla(45,90%,60%,0.02)_21px)]" />
      <div className="relative h-full flex flex-col justify-between gap-3">
        <Hand cards={dealer} hideFirst={dealerHidden} label="딜러" />
        <Hand cards={player} label="플레이어" />
      </div>
      <AnimatePresence>
        {outcome && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 flex items-center justify-center pointer-events-none"
          >
            <div className={`text-4xl md:text-6xl font-black drop-shadow-[0_0_30px_currentColor] ${
              outcome === "blackjack" ? "text-[hsl(var(--pink))]" :
              outcome === "win" ? "text-[hsl(var(--gold))]" :
              outcome === "push" ? "text-foreground" : "text-destructive"
            }`}>
              {outcome === "blackjack" ? "BLACKJACK!" : outcome === "win" ? "WIN" : outcome === "push" ? "PUSH" : "BUST"}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export const ImperialBlackjackTable = memo(ImperialBlackjackTableImpl);
export default ImperialBlackjackTable;
