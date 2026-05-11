import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Copy, Check, Crown, MessageCircle, Send } from "lucide-react";
import { formatKRW, type Pkg } from "@/lib/store";
import { notify } from "@/lib/notify";

const VIP_TIERS: Pkg["tier"][] = ["VIP", "GOD", "EMPIRE", "PHANTOM"];

// 운영자가 추후 변경할 컨시어지 채널(현재는 placeholder — 운영원칙 페이지에서 안내)
const CONCIERGE_KAKAO = "https://pf.kakao.com/_phonara";
const CONCIERGE_TELEGRAM = "https://t.me/phonara_vip";

async function copyText(text: string, label: string) {
  try {
    await navigator.clipboard.writeText(text);
    notify.success(`${label} 복사됨`);
  } catch {
    notify.error("복사 실패 — 직접 선택해주세요");
  }
}

function CopyRow({
  label,
  value,
  money,
}: {
  label: string;
  value: string;
  money?: boolean;
}) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="flex items-center justify-between gap-2 py-1.5">
      <span className="text-[11px] text-muted-foreground break-keep shrink-0">
        {label}
      </span>
      <div className="flex items-center gap-2 min-w-0">
        <span
          className={`text-xs font-bold truncate ${
            money ? "text-money-strong tabular-nums" : ""
          }`}
        >
          {value}
        </span>
        <button
          type="button"
          aria-label={`${label} 복사`}
          onClick={async () => {
            await copyText(value, label);
            setCopied(true);
            setTimeout(() => setCopied(false), 1400);
          }}
          className="w-7 h-7 rounded-md bg-muted/40 hover:bg-muted/70 flex items-center justify-center transition shrink-0"
        >
          {copied ? (
            <Check className="w-3.5 h-3.5 text-secondary" />
          ) : (
            <Copy className="w-3.5 h-3.5" />
          )}
        </button>
      </div>
    </div>
  );
}

export default function BankPayInstructionCard({ pkg }: { pkg: Pkg }) {
  const { t } = useTranslation("packages");
  const bank = t("modalBankValue"); // 예: "KB국민 123-456-78901234"
  const owner = t("modalOwnerValue");
  const amount = formatKRW(pkg.price);
  // 계좌번호만 따로 추출 (마지막 공백 이후가 통상 계좌번호)
  const accountOnly = bank.split(" ").slice(-1)[0] ?? bank;
  const isVip = VIP_TIERS.includes(pkg.tier);

  return (
    <div className="space-y-3">
      <div className="glass rounded-2xl p-4">
        <div className="text-[11px] text-muted-foreground mb-2 break-keep">
          입금 정보 — 아래 정보를 복사해 계좌이체로 송금해주세요
        </div>
        <CopyRow label="입금 금액" value={amount} money />
        <CopyRow label="입금 은행" value={bank} />
        <CopyRow label="계좌번호" value={accountOnly} />
        <CopyRow label="예금주" value={owner} />
        <p className="text-[10px] text-muted-foreground pt-2 mt-1 border-t border-border/40 break-keep">
          {t("modalMemo")}
        </p>
      </div>

      {isVip && (
        <div className="rounded-2xl p-4 border border-gold/40 bg-gradient-to-br from-gold/10 to-primary/5 relative overflow-hidden">
          <div className="absolute -top-10 -right-10 w-32 h-32 rounded-full bg-gold/20 blur-3xl pointer-events-none" />
          <div className="relative">
            <div className="flex items-center gap-2 mb-1">
              <Crown className="w-4 h-4 text-gold" />
              <span className="font-display font-black text-sm text-gradient-gold">
                VIP 전용 컨시어지
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground break-keep mb-3">
              고액 패키지는 1:1 전담 매니저가 입금 확인·승인 일정을 직접 안내해 드립니다. 평일·주말 24시간 응답.
            </p>
            <div className="flex flex-col sm:flex-row gap-2">
              <a
                href={CONCIERGE_KAKAO}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 inline-flex items-center justify-center gap-2 h-10 rounded-xl bg-gold/15 hover:bg-gold/25 transition text-xs font-bold border border-gold/30"
              >
                <MessageCircle className="w-4 h-4" />
                카카오톡 컨시어지
              </a>
              <a
                href={CONCIERGE_TELEGRAM}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 inline-flex items-center justify-center gap-2 h-10 rounded-xl bg-primary/15 hover:bg-primary/25 transition text-xs font-bold border border-primary/30"
              >
                <Send className="w-4 h-4" />
                텔레그램 컨시어지
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
