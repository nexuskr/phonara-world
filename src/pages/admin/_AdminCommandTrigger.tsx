/**
 * Stub trigger for the global ⌘K Command Palette.
 * Full cmdk integration ships in PR-3. For now this exposes the keyboard
 * affordance so users build the muscle memory and the header stays final.
 */
import { useEffect, useState, memo } from "react";
import { Search } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { NavLink } from "react-router-dom";
import { ADMIN_NAV_FLAT } from "@/pages/admin/_nav";

function AdminCommandTriggerBase() {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const matches = ADMIN_NAV_FLAT.filter((i) =>
    !q ? true : (i.name + " " + i.sectionLabel).toLowerCase().includes(q.toLowerCase()),
  ).slice(0, 12);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="hidden md:flex items-center gap-2 h-9 px-3 rounded-lg border border-border/60 bg-background/40 text-xs text-muted-foreground hover:border-primary/60 transition min-w-[200px]"
        aria-label="Open command palette"
      >
        <Search className="w-3.5 h-3.5" />
        <span className="flex-1 text-left">검색 / 이동…</span>
        <kbd className="text-[10px] px-1.5 py-0.5 rounded bg-muted/60 font-mono">⌘K</kbd>
      </button>
      <button
        onClick={() => setOpen(true)}
        className="md:hidden h-9 w-9 rounded-lg border border-border/60 bg-background/40 grid place-items-center"
        aria-label="Search"
      >
        <Search className="w-4 h-4 text-muted-foreground" />
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg p-0 overflow-hidden">
          <DialogHeader className="sr-only">
            <DialogTitle>Command Palette</DialogTitle>
          </DialogHeader>
          <div className="flex items-center gap-2 px-4 py-3 border-b border-border/40">
            <Search className="w-4 h-4 text-muted-foreground" />
            <input
              autoFocus
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="섹션·페이지 검색…"
              className="flex-1 bg-transparent outline-none text-sm"
            />
            <kbd className="text-[10px] px-1.5 py-0.5 rounded bg-muted/60 font-mono">ESC</kbd>
          </div>
          <div className="max-h-80 overflow-y-auto p-2">
            {matches.length === 0 ? (
              <div className="text-xs text-muted-foreground text-center py-8">결과 없음</div>
            ) : (
              matches.map((i) => {
                const Icon = i.icon;
                return (
                  <NavLink
                    key={i.id + i.to}
                    to={i.to}
                    onClick={() => setOpen(false)}
                    className="flex items-center gap-2 px-2 py-2 rounded-md text-xs hover:bg-muted/60"
                  >
                    <Icon className="w-3.5 h-3.5 text-muted-foreground" />
                    <span className="text-muted-foreground/70 mr-1">{i.sectionLabel}</span>
                    <span className="flex-1 truncate">{i.name}</span>
                    {i.aal2 && (
                      <span className="text-[9px] tracking-[0.2em] text-destructive/80 font-black">AAL2</span>
                    )}
                  </NavLink>
                );
              })
            )}
          </div>
          <div className="px-4 py-2 border-t border-border/40 text-[10px] text-muted-foreground">
            v0 · 페이지 점프 · 다음 PR에서 유저/거래/액션 검색 추가
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default memo(AdminCommandTriggerBase);
