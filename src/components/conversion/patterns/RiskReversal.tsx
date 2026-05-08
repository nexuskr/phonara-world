import { ShieldCheck } from "lucide-react";
import { useTranslation } from "react-i18next";

export default function RiskReversal() {
  const { t } = useTranslation("convert");
  return (
    <div className="flex items-center gap-2 text-[11px] text-muted-foreground break-keep">
      <ShieldCheck className="w-3.5 h-3.5 text-secondary" />
      <span>
        <span className="font-bold text-foreground">{t("refund7")}</span>
        <span> {t("refundLaw")}</span>
      </span>
    </div>
  );
}
