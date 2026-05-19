/** Imperial Blackjack engine — basic dealer hit-on-soft-17. */
import { handValue, newDeck, shuffle, isBlackjack, type Card } from "../types";

export interface BlackjackRound {
  deck: Card[];
  player: Card[];
  dealer: Card[];
}

export function startRound(seedHash?: string): BlackjackRound {
  const deck = shuffle(newDeck(), seedHash);
  const player = [deck.pop()!, deck.pop()!];
  const dealer = [deck.pop()!, deck.pop()!];
  return { deck, player, dealer };
}

export function dealerPlay(round: BlackjackRound): BlackjackRound {
  while (true) {
    const v = handValue(round.dealer);
    if (v.total < 17 || (v.total === 17 && v.soft)) {
      const c = round.deck.pop();
      if (!c) break;
      round.dealer.push(c);
    } else break;
  }
  return round;
}

export type SettleOutcome = "win" | "lose" | "push" | "blackjack";

export function settle(round: BlackjackRound): { outcome: SettleOutcome; multiplier: number } {
  const pv = handValue(round.player).total;
  const dv = handValue(round.dealer).total;
  const pbj = isBlackjack(round.player);
  const dbj = isBlackjack(round.dealer);
  if (pbj && !dbj) return { outcome: "blackjack", multiplier: 2.5 };
  if (pbj && dbj) return { outcome: "push", multiplier: 1 };
  if (pv > 21) return { outcome: "lose", multiplier: 0 };
  if (dv > 21) return { outcome: "win", multiplier: 2 };
  if (pv > dv) return { outcome: "win", multiplier: 2 };
  if (pv < dv) return { outcome: "lose", multiplier: 0 };
  return { outcome: "push", multiplier: 1 };
}

export { handValue };
