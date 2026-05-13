import { ShieldCheck, RotateCcw, HeartHandshake } from "lucide-react";

export default function TrustGuaranteeBadges() {
  const items = [
    {
      icon: RotateCcw,
      title: "7일 무조건 환불",
      desc: "첫 입금 후 7일 이내, 출금 미사용 시 100% 원금 환불",
      tone: "text-secondary",
    },
    {
      icon: HeartHandshake,
      title: "70% 손실 보호",
      desc: "Founding Emperor 7일 보호기간 내 순손실의 70%를 PHON으로 환급",
      tone: "text-money-strong",
    },
    {
      icon: ShieldCheck,
      title: "실시간 출금 공개",
      desc: "최근 100건의 완료 출금을 마스킹된 닉네임으로 실시간 공개",
      tone: "text-primary",
    },
  ];

  return (
    <div className="grid sm:grid-cols-3 gap-3">
      {items.map((it) => {
        const Icon = it.icon;
        return (
          <div key={it.title} className="glass rounded-2xl p-4">
            <div className={`flex items-center gap-2 ${it.tone}`}>
              <Icon className="w-4 h-4" />
              <span className="font-imperial font-bold text-sm">{it.title}</span>
            </div>
            <p className="mt-2 text-[11px] text-muted-foreground break-keep leading-relaxed">{it.desc}</p>
          </div>
        );
      })}
    </div>
  );
}
