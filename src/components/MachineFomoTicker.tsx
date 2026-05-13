import { useEffect, useState } from "react";
import { formatKRW } from "@/lib/store";
import { Bot } from "lucide-react";

const NICKS = ["Aurora***", "Cyber***K", "Neon***J", "Phantom***", "Tiger***", "Lumi***", "Crow***", "Storm***", "Vio***", "Mira***"];
const PKGS = [
  { name: "Easy Starter Machine", min: 3500, max: 4500 },
  { name: "Easy 50 Machine", min: 18000, max: 22000 },
  { name: "Easy 150 Machine", min: 65000, max: 75000 },
];

function makeFeed() {
  const nick = NICKS[Math.floor(Math.random() * NICKS.length)];
  const pkg = PKGS[Math.floor(Math.random() * PKGS.length)];
  const amt = Math.floor(pkg.min + Math.random() * (pkg.max - pkg.min));
  return { nick, pkg: pkg.name, amt };
}

export default function MachineFomoTicker() {
  const [item, setItem] = useState(makeFeed());
  useEffect(() => {
    const i = setInterval(() => setItem(makeFeed()), 6500);
    return () => clearInterval(i);
  }, []);
  return (
    <div className="glass rounded-xl px-3 py-2 flex items-center gap-2 overflow-hidden">
      <Bot className="w-3.5 h-3.5 text-gold shrink-0" />
      <p key={`${item.nick}-${item.amt}`} className="text-[11px] truncate animate-liquid-in">
        <span className="font-bold text-gold">{item.nick}</span>
        <span className="text-muted-foreground">님이 </span>
        <span className="font-bold">{item.pkg}</span>
        <span className="text-muted-foreground">으로 </span>
        <span className="font-display font-black text-gradient-gold">{formatKRW(item.amt)}</span>
        <span className="text-muted-foreground"> 수확!</span>
      </p>
    </div>
  );
}
