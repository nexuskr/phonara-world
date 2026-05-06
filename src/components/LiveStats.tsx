import { useEffect, useState } from "react";

// Smoothly fluctuating numbers — used for active users / total payouts / live ranking
export function useFluctuate(initial: number, { min = -200, max = 800, every = 1500 }: any = {}) {
  const [v, setV] = useState(initial);
  useEffect(() => {
    const t = setInterval(() => {
      setV(prev => Math.max(0, prev + Math.floor(Math.random() * (max - min)) + min));
    }, every);
    return () => clearInterval(t);
  }, [every, min, max]);
  return v;
}

export function useOnline() {
  return useFluctuate(2847, { min: -8, max: 14, every: 1200 });
}
export function useTotalPayout() {
  return useFluctuate(12_847_592_310, { min: 50_000, max: 480_000, every: 1100 });
}
export function useTodayPayout() {
  return useFluctuate(38_420_000, { min: 5_000, max: 120_000, every: 1300 });
}
export function useMembers() {
  return useFluctuate(284_392, { min: 0, max: 6, every: 2200 });
}
