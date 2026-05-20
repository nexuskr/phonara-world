// Phase 4 S4 — In-app support FAB (no 3rd-party widget).
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { notify } from "@/lib/notify";

export default function LiveChatFab() {
  const [open, setOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [msg, setMsg] = useState("");

  const submit = async () => {
    if (!msg.trim() || sending) return;
    setSending(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        notify.warn("로그인 필요", "지원 요청은 로그인 후 가능합니다.");
        return;
      }
      const { error } = await supabase.from("support_tickets" as any).insert({
        user_id: user.id,
        subject: "ApexForge live chat",
        body: msg.trim(),
        source: "apex_livechat",
        status: "open",
      } as any);
      if (error) throw error;
      notify.success("접수 완료", "곧 답변 드리겠습니다.");
      setMsg("");
      setOpen(false);
    } catch (e: any) {
      notify.error("전송 실패", e?.message ?? "잠시 후 다시 시도해 주세요.");
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setOpen(v => !v)}
        aria-label="Live support"
        className="fixed bottom-20 right-3 z-[70] grid h-12 w-12 place-items-center rounded-full bg-primary text-primary-foreground shadow-xl shadow-primary/30 hover:scale-105 transition"
      >💬</button>
      {open && (
        <div className="fixed bottom-36 right-3 z-[70] w-[min(360px,calc(100vw-1.5rem))] rounded-2xl border border-border bg-card/95 p-4 shadow-2xl backdrop-blur-md">
          <div className="mb-2 text-sm font-bold">ApexForge 지원</div>
          <p className="mb-3 text-xs text-muted-foreground">출금 / 베팅 / 계정 문의를 남겨주세요. 평균 응답 12분.</p>
          <textarea
            value={msg}
            onChange={e => setMsg(e.target.value)}
            placeholder="무엇을 도와드릴까요?"
            rows={4}
            className="w-full resize-none rounded-md border border-border bg-background p-2 text-sm"
          />
          <div className="mt-2 flex gap-2">
            <button
              onClick={submit}
              disabled={sending || !msg.trim()}
              className="flex-1 rounded-md bg-primary px-3 py-2 text-sm font-bold text-primary-foreground disabled:opacity-50"
            >{sending ? "전송 중…" : "보내기"}</button>
            <button
              onClick={() => setOpen(false)}
              className="rounded-md border border-border bg-muted px-3 py-2 text-sm text-muted-foreground"
            >닫기</button>
          </div>
        </div>
      )}
    </>
  );
}
