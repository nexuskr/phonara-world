// CherrySakura500 — Signature Slot 셸 (SlotSignatureWrapper 사용).
// 7번째이자 마지막 Signature Slot. 한국 50-70대 친화적 Low volatility.
import SlotSignatureWrapper from "@/components/slots/SlotSignatureWrapper";
import { CHERRY_SAKURA_THEME } from "@/components/slots/themes";
import SakuraPetalCanvas from "@/components/slots/SakuraPetalCanvas";
import SakuraPaytableSheet from "@/components/slots/SakuraPaytableSheet";
import SakuraMaxWinOverlay from "@/components/celebration/SakuraMaxWinOverlay";

export default function CherrySakura500Page() {
  return (
    <SlotSignatureWrapper
      slotId="cherry_sakura"
      theme={CHERRY_SAKURA_THEME}
      Background={SakuraPetalCanvas}
      PaytableSheet={SakuraPaytableSheet}
      MaxWinOverlay={SakuraMaxWinOverlay}
      flareColors={{ left: "rgba(249,168,212,0.22)", right: "rgba(163,230,187,0.18)" }}
      signatureLabel="Cherry Sakura · Signature"
      accentDotColor="rgba(249,168,212,1)"
      themeKey="sakura"
    />
  );
}
