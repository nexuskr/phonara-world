import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Share2, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { notify } from "@/lib/notify";

/**
 * Phase 4 P1 — Lightweight invite card for Dashboard.
 * Reuses existing profiles.referral_code (managed by SECURITY DEFINER RPCs).
 */
export default function InviteRailMini() {
  const [code, setCode] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user || !mounted) return;
      const { data } = await supabase
        .from("profiles")
        .select("referral_code")
        .eq("id", session.user.id)
        .maybeSingle();
      if (mounted) setCode((data as any)?.referral_code ?? null);
    })();
    return () => { mounted = false; };
  }, []);

  if (!code) return null;

  const link = `${window.location.origin}/?ref=${encodeURIComponent(code)}`;

  const share = async () => {
    const payload = {
      title: "Imperial Empire",
      text: "0원으로 시작해서 매일 돈을 버는 곳. 15,000 PHON 환영 보너스.",
      url: link,
    };
    try {
      if (navigator.share) {
        await navigator.share(payload);
        return;
      }
    } catch {}
    try {
      await navigator.clipboard.writeText(link);
      notify.success("초대 링크 복사 완료");
    } catch {
      notify.error("복사 실패");
    }
  };

  return (
    <Card className="border-amber-400/30 bg-gradient-to-br from-amber-950/20 to-background p-4">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-500/15 ring-1 ring-amber-400/40">
          <Users className="h-5 w-5 text-amber-300" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold">친구를 황궁으로 초대</div>
          <div className="truncate text-xs text-muted-foreground">{code}</div>
        </div>
        <Button size="sm" onClick={share} className="bg-amber-500 text-amber-950 hover:bg-amber-400">
          <Share2 className="mr-1 h-4 w-4" /> 공유
        </Button>
      </div>
    </Card>
  );
}
