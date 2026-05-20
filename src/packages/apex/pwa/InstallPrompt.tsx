// Phase 4 P4-B — A2HS install prompt (lazy).
// localStorage 1-shot dedupe. Money-flow 0 touch.
import { useEffect, useState } from "react";

const KEY = "apex:install_prompt_v1";

type BIPEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export default function InstallPrompt() {
  const [evt, setEvt] = useState<BIPEvent | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    try { if (localStorage.getItem(KEY)) return; } catch {}
    const onBip = (e: Event) => {
      e.preventDefault();
      setEvt(e as BIPEvent);
      setOpen(true);
    };
    window.addEventListener("beforeinstallprompt", onBip as any);
    return () => window.removeEventListener("beforeinstallprompt", onBip as any);
  }, []);

  const dismiss = () => {
    try { localStorage.setItem(KEY, String(Date.now())); } catch {}
    setOpen(false);
  };

  const accept = async () => {
    if (!evt) return dismiss();
    try {
      await evt.prompt();
      await evt.userChoice;
    } finally {
      dismiss();
    }
  };

  if (!open || !evt) return null;
  return (
    <div
      role="dialog"
      aria-label="앱 설치"
      className="fixed inset-x-2 bottom-2 z-[80] mx-auto max-w-md rounded-2xl border border-primary/30 bg-card/95 p-4 shadow-2xl backdrop-blur-md sm:inset-x-auto sm:right-4"
    >
      <div className="flex items-start gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary/20 text-primary">⚡</div>
        <div className="flex-1">
          <div className="text-sm font-bold">ApexForge를 홈 화면에</div>
          <div className="mt-0.5 text-xs text-muted-foreground">
            출금 6분 · Race 알림 · 오프라인 셸까지 설치형으로 압살.
          </div>
        </div>
      </div>
      <div className="mt-3 flex gap-2">
        <button
          onClick={accept}
          className="flex-1 rounded-md bg-primary px-3 py-2 text-sm font-bold text-primary-foreground"
        >설치</button>
        <button
          onClick={dismiss}
          className="rounded-md border border-border bg-muted px-3 py-2 text-sm text-muted-foreground"
        >나중에</button>
      </div>
    </div>
  );
}
