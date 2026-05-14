// Week 3 Viral — Influencer code landing /i/:code
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { getFingerprint } from "@/lib/deviceFingerprint";
import { Crown } from "lucide-react";

type Inf = { code: string; display_name: string; channel: string | null; bonus_phon: number; bonus_crown: number };

export default function InfluencerLanding() {
  const { code = "" } = useParams();
  const nav = useNavigate();
  const [inf, setInf] = useState<Inf | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const norm = code.toUpperCase();
      const { data } = await supabase.rpc("get_influencer_public", { _code: norm });
      const row = (data?.[0] as Inf) ?? null;
      if (!mounted) return;
      setInf(row);
      setLoading(false);
      if (row) {
        let fp = "";
        try { fp = await getFingerprint(); } catch {}
        void supabase.rpc("track_influencer_click", {
          _code: norm, _fingerprint: fp, _referrer: document.referrer || null,
        });
        try {
          localStorage.setItem("pm_inf_code", norm);
          localStorage.setItem("pm_ref_code", norm);
        } catch {}
        // Redirect to landing after 1.6s with the influencer banner shown
        setTimeout(() => nav(`/?ref=${encodeURIComponent(norm)}`, { replace: true }), 1600);
      } else {
        setTimeout(() => nav("/", { replace: true }), 1200);
      }
    })();
    return () => { mounted = false; };
  }, [code, nav]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="text-center max-w-md space-y-4">
        <Crown className="h-12 w-12 mx-auto text-primary animate-pulse" />
        {loading ? (
          <p className="text-muted-foreground">코드 확인 중...</p>
        ) : inf ? (
          <>
            <h1 className="text-2xl font-extrabold">{inf.display_name}님의 초대</h1>
            <p className="text-muted-foreground text-sm">
              {inf.bonus_phon > 0 && <>가입 시 +{inf.bonus_phon.toLocaleString()} PHON</>}
              {inf.bonus_phon > 0 && inf.bonus_crown > 0 && " · "}
              {inf.bonus_crown > 0 && <>+{inf.bonus_crown.toLocaleString()} Crown</>}
            </p>
            <div className="text-xs text-muted-foreground">잠시 후 자동 이동합니다...</div>
          </>
        ) : (
          <>
            <p>유효하지 않은 코드입니다.</p>
            <div className="text-xs text-muted-foreground">홈으로 이동합니다...</div>
          </>
        )}
      </div>
    </div>
  );
}
