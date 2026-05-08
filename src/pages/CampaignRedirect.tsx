import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, AlertTriangle } from "lucide-react";

export default function CampaignRedirect() {
  const { slug } = useParams<{ slug: string }>();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!slug) {
        setError("잘못된 캠페인 링크입니다.");
        return;
      }
      try {
        const { data, error } = await supabase.rpc("track_campaign_click", { _slug: slug });
        if (cancelled) return;
        if (error) {
          setError("리다이렉트 중 오류가 발생했습니다.");
          return;
        }
        const url = typeof data === "string" ? data : null;
        if (!url || !/^https?:\/\//i.test(url)) {
          setError("캠페인을 찾을 수 없거나 비활성화되었습니다.");
          return;
        }
        // Hard redirect (replace so back button doesn't loop here)
        window.location.replace(url);
      } catch (e) {
        if (!cancelled) setError("네트워크 오류가 발생했습니다.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [slug]);

  return (
    <main className="min-h-screen flex items-center justify-center bg-background p-6">
      <div className="glass rounded-2xl border border-border p-6 max-w-sm w-full text-center space-y-3">
        {!error ? (
          <>
            <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto" />
            <h1 className="font-display font-black text-lg">이동 중…</h1>
            <p className="text-xs text-muted-foreground font-mono break-all">/c/{slug}</p>
          </>
        ) : (
          <>
            <AlertTriangle className="w-8 h-8 text-destructive mx-auto" />
            <h1 className="font-display font-black text-lg">링크를 열 수 없어요</h1>
            <p className="text-xs text-muted-foreground">{error}</p>
            <Link to="/" className="inline-block mt-2 text-xs text-primary underline">
              홈으로 돌아가기
            </Link>
          </>
        )}
      </div>
    </main>
  );
}
