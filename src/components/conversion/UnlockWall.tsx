import { Link } from "react-router-dom";
import { X, Crown, Users, Phone, Sparkles, Check, Lock } from "lucide-react";
import { formatKRW } from "@/lib/store";
import { track } from "@/lib/analytics";

/**
 * 출금 직전 3-Path 화면.
 *  Path A: STARTER 결제 (강조)
 *  Path B: 추천 1명 활성화
 *  Path C: 48h 대기 + 폰 인증
 */
export default function UnlockWall({
  amount,
  onClose,
}: {
  amount: number;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[75] bg-background/90 backdrop-blur-xl flex items-end sm:items-center justify-center p-4">
      <div className="w-full max-w-md glass-strong rounded-3xl p-6 neon-border relative overflow-hidden animate-fade-up">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 rounded-full bg-muted/40 flex items-center justify-center"
          aria-label="닫기"
        >
          <X className="w-4 h-4" />
        </button>
        <div className="absolute -top-20 -right-20 w-40 h-40 rounded-full bg-gradient-gold blur-3xl opacity-30" />

        <div className="relative">
          <div className="flex items-center gap-2 text-[10px] tracking-[0.3em] text-secondary font-black">
            <Lock className="w-3 h-3" /> 출금 1단계 클리어
          </div>
          <h2 className="font-imperial text-xl text-gradient-imperial mt-1">
            마지막 단계 — 다음 중 하나
          </h2>
          <p className="text-[11px] text-muted-foreground mt-1">
            출금 신청 금액: <span className="font-bold text-foreground">{formatKRW(amount)}</span>
          </p>

          {/* Path A — 강조 */}
          <Link
            to="/packages"
            onClick={() => track("unlock_wall_path_a_click")}
            className="press relative mt-4 block glass-strong rounded-2xl p-4 border-2 border-gold/60 overflow-hidden"
          >
            <span className="absolute top-2 right-2 text-[9px] font-black px-2 py-0.5 rounded-full bg-gradient-gold text-gold-foreground">
              가장 빠름 · 추천
            </span>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-gold flex items-center justify-center glow-imperial shrink-0">
                <Crown className="w-5 h-5 text-gold-foreground" />
              </div>
              <div className="flex-1">
                <div className="font-display font-black text-sm">STARTER 결제</div>
                <div className="text-[10px] text-muted-foreground">
                  즉시 해제 + ₩3,000 보너스 + 30일 적립
                </div>
              </div>
              <Sparkles className="w-4 h-4 text-gold" />
            </div>
            <div className="mt-3 flex items-center gap-1.5 text-[10px]">
              <Check className="w-3 h-3 text-secondary" />
              <span className="text-secondary font-bold">즉시 출금 가능</span>
              <span className="text-muted-foreground">· 첫 결제 ₩9,900</span>
            </div>
          </Link>

          {/* Path B */}
          <Link
            to="/profile"
            onClick={() => track("unlock_wall_path_b_click")}
            className="press relative mt-3 block glass rounded-2xl p-3 border border-border/40"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-secondary/20 flex items-center justify-center shrink-0">
                <Users className="w-4 h-4 text-secondary" />
              </div>
              <div className="flex-1">
                <div className="font-bold text-xs">친구 1명 활성화</div>
                <div className="text-[10px] text-muted-foreground">
                  추천코드 공유 → 친구 가입 + 첫 미션 완료
                </div>
              </div>
              <span className="text-[10px] text-muted-foreground">평균 1~3일</span>
            </div>
          </Link>

          {/* Path C */}
          <button
            onClick={() => {
              track("unlock_wall_path_c_click");
              onClose();
            }}
            className="press relative mt-2 block w-full glass rounded-2xl p-3 border border-border/30 opacity-70 text-left"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-muted/40 flex items-center justify-center shrink-0">
                <Phone className="w-4 h-4 text-muted-foreground" />
              </div>
              <div className="flex-1">
                <div className="font-bold text-xs">48시간 대기 + 폰 인증</div>
                <div className="text-[10px] text-muted-foreground">
                  가장 느린 길 · 신뢰점수 검증
                </div>
              </div>
              <span className="text-[10px] text-muted-foreground">2일+</span>
            </div>
          </button>

          <p className="mt-4 text-[10px] text-center text-muted-foreground">
            출금 보호 정책 · 봇/어뷰징 방지
          </p>
        </div>
      </div>
    </div>
  );
}
