/**
 * /pay — Phonara Pay 단독 페이지.
 * 운영자 TRON 입금 주소는 추후 admin_settings 테이블에서 로드하거나 secret로 주입.
 * 임시로 환경변수 VITE_PHONARA_TRON_ADDRESS 사용.
 */
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import PhonaraPayPanel from "@/components/empire/PhonaraPayPanel";

export default function PayPage() {
  const nav = useNavigate();
  // Vite는 VITE_ 접두사 환경변수만 노출. 운영자가 .env에 채우거나 추후 admin_settings 테이블로 이전.
  const addr = (import.meta.env.VITE_PHONARA_TRON_ADDRESS as string | undefined) || "";

  return (
    <div className="min-h-screen bg-background">
      <div className="container py-6 max-w-xl">
        <button onClick={() => nav(-1)} className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mb-4">
          <ArrowLeft className="w-3.5 h-3.5" /> 돌아가기
        </button>
        <div className="mb-5">
          <h1 className="font-display font-black text-3xl text-gradient-imperial">Phonara Pay</h1>
          <p className="text-xs text-muted-foreground mt-1">
            USDT TRC20로 입금 → 자동으로 PHON 적립. PG사 없이 1분 안에.
          </p>
        </div>
        <PhonaraPayPanel receiveAddress={addr} />
      </div>
    </div>
  );
}
