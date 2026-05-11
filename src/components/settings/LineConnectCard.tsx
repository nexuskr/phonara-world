import { useEffect, useState } from "react";
import { MessageCircle, Copy, Check, Link2, Unlink } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { notify } from "@/lib/notify";

// 운영자가 LINE 공식계정 친구추가 링크로 교체 (LINE Developers Console → Messaging API → Bot basic ID 또는 QR)
const LINE_FRIEND_URL = "https://line.me/R/ti/p/@phonara";

export default function LineConnectCard() {
  const [linked, setLinked] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  async function refresh() {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    const { data } = await supabase
      .from("line_subscriptions")
      .select("user_id, unlinked_at")
      .eq("user_id", u.user.id)
      .maybeSingle();
    setLinked(!!data && !data.unlinked_at);
  }

  useEffect(() => {
    void refresh();
  }, []);

  async function issueToken() {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc("issue_line_link_token");
      if (error) throw error;
      setToken(String(data));
      notify.success("토큰이 발급되었습니다 (15분 유효)");
    } catch (e: any) {
      notify.error(e?.message ?? "토큰 발급 실패");
    } finally {
      setLoading(false);
    }
  }

  async function copyToken() {
    if (!token) return;
    try {
      await navigator.clipboard.writeText(token);
      setCopied(true);
      notify.success("토큰 복사됨");
      setTimeout(() => setCopied(false), 1500);
    } catch {
      notify.error("복사 실패");
    }
  }

  async function unlink() {
    setLoading(true);
    try {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return;
      const { error } = await supabase
        .from("line_subscriptions")
        .update({ unlinked_at: new Date().toISOString() })
        .eq("user_id", u.user.id);
      if (error) throw error;
      setLinked(false);
      notify.success("LINE 알림 연결이 해제되었습니다");
    } catch (e: any) {
      notify.error(e?.message ?? "해제 실패");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="p-4 glass-strong">
      <div className="flex items-start gap-3">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-white"
          style={{
            background: "linear-gradient(135deg, hsl(140 65% 45%), hsl(140 65% 35%))",
          }}
        >
          <MessageCircle className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-display font-bold text-sm">LINE 알림</span>
            {linked && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-secondary/20 text-secondary font-bold">
                연결됨
              </span>
            )}
          </div>
          <div className="text-xs text-muted-foreground mt-0.5 break-keep">
            미션 보상·출금 승인·랭킹 변동을 LINE 메시지로 받아보세요.
          </div>
        </div>
        {linked ? (
          <Button
            size="sm"
            variant="outline"
            disabled={loading}
            onClick={unlink}
            aria-label="LINE 알림 해제"
          >
            <Unlink className="w-3.5 h-3.5 mr-1" /> 해제
          </Button>
        ) : (
          <Button size="sm" disabled={loading} onClick={issueToken}>
            <Link2 className="w-3.5 h-3.5 mr-1" /> 연결
          </Button>
        )}
      </div>

      {!linked && token && (
        <div className="mt-3 p-3 rounded-xl bg-muted/30 border border-border/50 space-y-2">
          <div className="text-[11px] text-muted-foreground break-keep">
            ① 아래 버튼으로 Phonara LINE 공식계정을 친구추가 →<br />
            ② LINE 채팅창에 아래 8자리 토큰을 그대로 전송하면 연결됩니다 (15분 유효).
          </div>
          <div className="flex items-center gap-2">
            <code className="flex-1 text-center font-mono font-black text-base tracking-[0.3em] bg-background/60 rounded-lg py-2">
              {token}
            </code>
            <button
              type="button"
              onClick={copyToken}
              aria-label="토큰 복사"
              className="w-9 h-9 rounded-md bg-muted/40 hover:bg-muted/70 flex items-center justify-center"
            >
              {copied ? (
                <Check className="w-4 h-4 text-secondary" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
            </button>
          </div>
          <a
            href={LINE_FRIEND_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="block text-center h-10 leading-10 rounded-xl text-xs font-black text-white"
            style={{
              background: "linear-gradient(135deg, hsl(140 65% 45%), hsl(140 65% 35%))",
            }}
          >
            Phonara LINE 친구추가
          </a>
        </div>
      )}
    </Card>
  );
}
