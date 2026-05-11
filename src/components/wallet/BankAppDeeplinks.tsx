import { markDepositIntent } from "@/lib/funnel";

/**
 * 한국 주요 6개 은행/금융앱 송금 딥링크.
 *
 * - 모바일에서 클릭 시 해당 앱이 설치되어 있으면 송금 화면으로 이동.
 * - 미설치 시 일반적으로 OS가 앱스토어로 폴백.
 * - 데스크톱에서는 가이드 텍스트만 노출.
 *
 * ⚠ 딥링크 스킴은 각 은행 공식 문서 기준으로만 추가하고, 미공개 스킴은 일반 "앱 열기" 시도로만 둔다.
 */
type Bank = { id: string; name: string; emoji: string; scheme?: string };

const BANKS: Bank[] = [
  { id: "toss",    name: "토스",       emoji: "🟦", scheme: "supertoss://send" },
  { id: "kakao",   name: "카카오뱅크", emoji: "🟡", scheme: "kakaobank://" },
  { id: "kb",      name: "KB국민",     emoji: "🟨", scheme: "kbstar://" },
  { id: "shinhan", name: "신한SOL",    emoji: "🔵", scheme: "shinhan-sr-ansimclick://" },
  { id: "woori",   name: "우리WON",    emoji: "🔷", scheme: "newwooribank://" },
  { id: "nh",      name: "농협NH",     emoji: "🟢", scheme: "nhallonepay://" },
];

export default function BankAppDeeplinks({ amount }: { amount?: string }) {
  const isMobile = typeof navigator !== "undefined" && /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent);

  const onClick = (b: Bank) => {
    markDepositIntent("bank_app_deeplink", { bank: b.id, amount });
    if (!isMobile || !b.scheme) return;
    try {
      window.location.href = b.scheme;
    } catch {}
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="text-[11px] tracking-[0.2em] font-bold text-primary uppercase">
          은행앱 1탭 송금
        </div>
        <div className="text-[10px] text-muted-foreground">탭 → 송금 화면 즉시 이동</div>
      </div>
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
        {BANKS.map((b) => (
          <button
            key={b.id}
            type="button"
            onClick={() => onClick(b)}
            className="min-h-[64px] flex flex-col items-center justify-center gap-1 rounded-xl glass border border-border/40 hover:border-primary/60 hover:glow-imperial transition press"
          >
            <span className="text-xl leading-none">{b.emoji}</span>
            <span className="text-[10px] font-bold">{b.name}</span>
          </button>
        ))}
      </div>
      {!isMobile && (
        <p className="text-[10px] text-muted-foreground leading-relaxed">
          데스크톱에서는 은행 웹 송금을 이용해 주세요. 모바일에서 1탭으로 송금 화면 이동이 가능합니다.
        </p>
      )}
    </div>
  );
}
