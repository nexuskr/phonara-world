/**
 * /pay — Phonara Pay 단독 페이지.
 * 입금 주소는 get_pay_receive_address RPC로 로드 (admin이 pay_config 테이블에 설정).
 */
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import PhonaraPayPanel from "@/components/empire/PhonaraPayPanel";
import { supabase } from "@/integrations/supabase/client";

export default function PayPage() {
  const nav = useNavigate();
  const [addr, setAddr] = useState<string>("");

  useEffect(() => {
    supabase.rpc("get_pay_receive_address").then(({ data }) => {
      if (data) setAddr(String(data));
    });
  }, []);

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
