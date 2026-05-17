// SlotSignatureWrapper — 모든 Signature Slot 페이지의 공용 셸.
// CasinoLayout + Background + Edge Flare + Header + OlympusSlot + MaxWin overlay
// + DEV cheats + 햅틱/GPU 레이어를 한 곳에 모음. 슬롯 페이지는 props만 주입.
//
// 규칙:
//  - OlympusSlot/SoundManager/WinCelebrationManager 무수정.
//  - 모든 사운드/셀러브레이션은 Facade(useSlotSound, WinCelebrationManager) 경유.
//  - 모바일 60fps 유지 위해 모든 레이어에 transform3d + will-change 적용.
import { useEffect, type ComponentType, type ReactNode } from "react";
import CasinoLayout from "@/components/casino/CasinoLayout";
import OlympusSlot from "@/components/slots/OlympusSlot";
import Disclaimer from "@/components/Disclaimer";
import DevWinCheats from "@/components/slots/DevWinCheats";
import SoundTimingPanel from "@/components/dev/SoundTimingPanel";
import { useRequireAuth } from "@/hooks/use-require-auth";
import { useSlotSound } from "@/hooks/useSlotSound";
import { useEmpireCrown } from "@/hooks/useEmpireCrown";
import type { MaxWinTriggeredPayload } from "@/components/celebration/BaseMaxWinOverlay";
import type { SlotTheme } from "@/components/slots/OlympusSlot";

export interface SlotSignatureWrapperProps {
  /** URL slug — useSlotSound 매핑 키. ex) "cosmic_forge", "neon_tokyo_88". */
  slotId: string;
  theme: SlotTheme;
  /** 절대 위치로 깔리는 배경 캔버스 컴포넌트. */
  Background?: ComponentType;
  /** 헤더 우측에 마운트되는 Paytable 트리거 컴포넌트(자체 버튼 포함). */
  PaytableSheet?: ComponentType;
  /** maxMultiplier 도달 시 발동하는 풀스크린 cinematic. */
  MaxWinOverlay?: ComponentType<{
    triggerAt: number;
    onMaxWinTriggered?: (payload: MaxWinTriggeredPayload) => void;
    slotId?: string;
    themeKey?: string;
  }>;
  /** 좌우 edge flare 색상 (hex/rgba). 기본은 보라/시안. */
  flareColors?: { left: string; right: string };
  /** 헤더 좌측 라벨. ex) "Cosmic Forge · Signature". */
  signatureLabel?: string;
  /** MAX trigger / DevCheats 기본값. 미지정 시 theme.maxMultiplier. */
  maxMultiplier?: number;
  /** 헤더 dot 색상 (hex/rgba) — 기본 cyan. */
  accentDotColor?: string;
  /** themeKey — DevCheats / 헤더 표시용. 기본 theme.symbolPack. */
  themeKey?: string;
  children?: ReactNode;
}

const DEFAULT_FLARE = {
  left: "rgba(167,139,250,0.18)",   // violet-400/18
  right: "rgba(34,211,238,0.16)",   // cyan-400/16
};

export default function SlotSignatureWrapper({
  slotId,
  theme,
  Background,
  PaytableSheet,
  MaxWinOverlay,
  flareColors = DEFAULT_FLARE,
  signatureLabel,
  maxMultiplier,
  accentDotColor = "rgba(34,211,238,1)",
  themeKey,
  children,
}: SlotSignatureWrapperProps) {
  const user = useRequireAuth();
  useSlotSound(slotId);
  const { handleMaxWinTriggered } = useEmpireCrown(slotId);

  // 위임형 햅틱 — Spin/Bet 영역 버튼 누름에만 navigator.vibrate(8).
  // 메모리 누수 0 — root 단일 listener.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const root = document.getElementById(`signature-root-${slotId}`);
    if (!root) return;
    const onPointer = (e: PointerEvent) => {
      const t = e.target as HTMLElement | null;
      if (!t) return;
      const btn = t.closest("button");
      if (!btn) return;
      const aria = btn.getAttribute("aria-label") ?? "";
      const txt = btn.textContent ?? "";
      if (
        /spin|스핀|bet|베팅|\+|−|-/i.test(aria + " " + txt) &&
        typeof navigator !== "undefined" &&
        typeof navigator.vibrate === "function"
      ) {
        try { navigator.vibrate(8); } catch { /* */ }
      }
    };
    root.addEventListener("pointerdown", onPointer, { passive: true });
    return () => root.removeEventListener("pointerdown", onPointer);
  }, [slotId]);

  if (!user) return null;

  const triggerAt = maxMultiplier ?? theme.maxMultiplier;
  const cheatsTheme = themeKey ?? theme.symbolPack;

  return (
    <CasinoLayout backTo="/casino" backLabel="슬롯 로비로">
      <div
        id={`signature-root-${slotId}`}
        className="relative isolate"
        style={{ transform: "translate3d(0,0,0)" }}
      >
        {/* Background layer — absolute, pointer-events-none */}
        {(Background || flareColors) && (
          <div className="absolute inset-0 -z-10 overflow-hidden">
            {Background && <Background />}
            {/* 좌우 항상 ON edge flare — 저강도 */}
            <div
              aria-hidden
              className="pointer-events-none absolute left-0 top-0 h-full w-[18%]"
              style={{
                background: `linear-gradient(90deg, ${flareColors.left} 0%, rgba(0,0,0,0) 100%)`,
                filter: "blur(20px)",
                willChange: "transform",
                transform: "translate3d(0,0,0)",
              }}
            />
            <div
              aria-hidden
              className="pointer-events-none absolute right-0 top-0 h-full w-[18%]"
              style={{
                background: `linear-gradient(270deg, ${flareColors.right} 0%, rgba(0,0,0,0) 100%)`,
                filter: "blur(20px)",
                willChange: "transform",
                transform: "translate3d(0,0,0)",
              }}
            />
          </div>
        )}

        <div className="container py-4 space-y-4 [&_button:active]:scale-[0.98] [&_button]:transition-transform">
          {/* Header — signature label + Paytable */}
          {(signatureLabel || PaytableSheet) && (
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                {signatureLabel && (
                  <>
                    <span
                      className="inline-block h-2.5 w-2.5 rounded-full shrink-0"
                      style={{
                        background: accentDotColor,
                        boxShadow: `0 0 12px ${accentDotColor}`,
                      }}
                      aria-hidden
                    />
                    <span className="text-xs font-semibold tracking-wider uppercase text-foreground/90 truncate">
                      {signatureLabel}
                    </span>
                  </>
                )}
              </div>
              {PaytableSheet && <PaytableSheet />}
            </div>
          )}

          {/* Slot core (page may pass its own children, or wrapper renders default). */}
          {children ?? <OlympusSlot theme={theme} />}

          <Disclaimer />
        </div>

        {/* MAX WIN cinematic */}
        {MaxWinOverlay && (
          <MaxWinOverlay
            triggerAt={triggerAt}
            slotId={slotId}
            themeKey={themeKey ?? theme.symbolPack}
            onMaxWinTriggered={handleMaxWinTriggered}
          />
        )}

        {/* DEV cheats — production 자동 제거 */}
        <DevWinCheats
          themeKey={cheatsTheme}
          unitLabel="DEMO 칩"
          maxMultiplier={triggerAt}
        />
      </div>
    </CasinoLayout>
  );
}
