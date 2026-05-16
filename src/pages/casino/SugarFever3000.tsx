// Sugar Fever 3000 — Signature Slot page.
// Identical shape to OlympusLegacy5000. All differences flow through:
//   1) SUGAR_FEVER_THEME (themes.ts)
//   2) SugarFeverCanvas (warm pastel candy background)
//   3) SugarFeverPaytableSheet
//   4) SugarFeverMaxWinOverlay (React.lazy for perf)
import { lazy, Suspense } from "react";
import { SUGAR_FEVER_THEME } from "@/components/slots/themes";
import SlotSignatureWrapper from "@/components/slots/SlotSignatureWrapper";
import SugarFeverCanvas from "@/components/slots/SugarFeverCanvas";
import SugarFeverPaytableSheet from "@/components/slots/SugarFeverPaytableSheet";

// Heavy MAX WIN cinematic — only load when user actually opens the slot.
const SugarFeverMaxWinOverlay = lazy(
  () => import("@/components/celebration/SugarFeverMaxWinOverlay"),
);

function MaxWinOverlayLazy(props: React.ComponentProps<typeof SugarFeverMaxWinOverlay>) {
  return (
    <Suspense fallback={null}>
      <SugarFeverMaxWinOverlay {...props} />
    </Suspense>
  );
}

export default function SugarFever3000Page() {
  return (
    <SlotSignatureWrapper
      slotId="sugar_fever"
      theme={SUGAR_FEVER_THEME}
      Background={SugarFeverCanvas}
      PaytableSheet={SugarFeverPaytableSheet}
      MaxWinOverlay={MaxWinOverlayLazy}
      flareColors={{
        // warm pastel pink + golden pastel — never cold, never childish
        left: "rgba(255,180,205,0.22)",
        right: "rgba(255,210,130,0.20)",
      }}
      signatureLabel="Sugar Fever · Signature"
      accentDotColor="rgba(255,180,205,1)"
      themeKey="olympus"
    />
  );
}
