// Olympus Legacy 5000 — flagship Signature Slot page.
// Identical shape to CosmicForge5000. All differences flow through:
//   1) OLYMPUS_LEGACY_THEME (themes.ts)
//   2) OlympusLegacyCanvas (warm cinematic background)
//   3) OlympusLegacyPaytableSheet
//   4) OlympusLegacyMaxWinOverlay (React.lazy for perf)
import { lazy, Suspense } from "react";
import { OLYMPUS_LEGACY_THEME } from "@/components/slots/themes";
import SlotSignatureWrapper from "@/components/slots/SlotSignatureWrapper";
import OlympusLegacyCanvas from "@/components/slots/OlympusLegacyCanvas";
import OlympusLegacyPaytableSheet from "@/components/slots/OlympusLegacyPaytableSheet";

// Heavy MAX WIN cinematic — only load when user actually opens the slot.
const OlympusLegacyMaxWinOverlay = lazy(
  () => import("@/components/celebration/OlympusLegacyMaxWinOverlay"),
);

function MaxWinOverlayLazy(props: React.ComponentProps<typeof OlympusLegacyMaxWinOverlay>) {
  return (
    <Suspense fallback={null}>
      <OlympusLegacyMaxWinOverlay {...props} />
    </Suspense>
  );
}

export default function OlympusLegacy5000Page() {
  return (
    <SlotSignatureWrapper
      slotId="olympus_legacy"
      theme={OLYMPUS_LEGACY_THEME}
      Background={OlympusLegacyCanvas}
      PaytableSheet={OlympusLegacyPaytableSheet}
      MaxWinOverlay={MaxWinOverlayLazy}
      flareColors={{
        // warm amber on both edges — Trump showmanship, never cold blue
        left: "rgba(255,196,90,0.22)",
        right: "rgba(255,170,60,0.20)",
      }}
      signatureLabel="Olympus Legacy · Flagship"
      accentDotColor="rgba(255,196,90,1)"
      themeKey="olympus"
    />
  );
}
