/**
 * ⌘K Command Palette — section/page jump + user search (PR-13).
 * - Sections from ADMIN_NAV (AAL2 marked)
 * - Live user search via admin_search_users RPC (debounced 200ms, min 2 chars)
 *   Result navigates to /admin/product/users?q=<userid> which auto-seeds search.
 */
import { useEffect, useState, useMemo, memo, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Search, User as UserIcon, Loader2 } from "lucide-react";
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandShortcut,
  CommandSeparator,
} from "@/components/ui/command";
import { ADMIN_NAV } from "@/pages/admin/_nav";
import { supabase } from "@/integrations/supabase/client";

type UserHit = {
  user_id: string;
  username: string | null;
  email: string | null;
  tier: string | null;
  created_at: string;
};

function AdminCommandTriggerBase() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<UserHit[]>([]);
  const [searching, setSearching] = useState(false);
  const debounceRef = useRef<number | null>(null);
  const navigate = useNavigate();

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

  // Debounced user search
  useEffect(() => {
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    const q = query.trim();
    if (q.length < 2) {
      setHits([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    debounceRef.current = window.setTimeout(async () => {
      try {
        const { data, error } = await (supabase as any).rpc("admin_search_users", {
          _q: q,
          _limit: 8,
        });
        if (error) throw error;
        setHits((data ?? []) as UserHit[]);
      } catch {
        setHits([]);
      } finally {
        setSearching(false);
      }
    }, 200);
    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    };
  }, [query]);

  const go = useCallback(
    (to: string) => {
      setOpen(false);
      requestAnimationFrame(() => navigate(to));
    },
    [navigate],
  );

  const groups = useMemo(() => ADMIN_NAV, []);

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

      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput
          placeholder="섹션·페이지 검색 / 닉네임·이메일·UUID로 유저 찾기…"
          value={query}
          onValueChange={setQuery}
        />
        <CommandList>
          <CommandEmpty>결과 없음</CommandEmpty>

          {/* User results */}
          {query.trim().length >= 2 && (
            <>
              <CommandGroup
                heading={
                  <span className="flex items-center gap-2">
                    <UserIcon className="w-3 h-3" />
                    유저
                    {searching && <Loader2 className="w-3 h-3 animate-spin opacity-70" />}
                  </span>
                }
              >
                {hits.length === 0 && !searching && (
                  <div className="px-3 py-2 text-[11px] text-muted-foreground">
                    일치하는 유저 없음 (닉네임 / 이메일 / UUID 2자 이상)
                  </div>
                )}
                {hits.map((u) => (
                  <CommandItem
                    key={u.user_id}
                    value={`user ${u.username ?? ""} ${u.email ?? ""} ${u.user_id}`}
                    onSelect={() =>
                      go(`/admin/product/users?q=${encodeURIComponent(u.username ?? u.user_id)}`)
                    }
                  >
                    <UserIcon className="w-3.5 h-3.5 mr-2 text-muted-foreground" />
                    <div className="flex flex-col min-w-0">
                      <span className="truncate font-bold text-xs">
                        {u.username ?? "(no nickname)"}
                      </span>
                      <span className="truncate text-[10px] text-muted-foreground">
                        {u.email ?? u.user_id.slice(0, 8)}
                      </span>
                    </div>
                    <CommandShortcut className="text-[9px] tracking-[0.2em] font-black uppercase">
                      {u.tier ?? "free"}
                    </CommandShortcut>
                  </CommandItem>
                ))}
              </CommandGroup>
              <CommandSeparator />
            </>
          )}

          {groups.map((section) => (
            <CommandGroup
              key={section.id}
              heading={`${section.emoji}  ${section.label}${section.aal2 ? "  · AAL2" : ""}`}
            >
              {section.items.map((item) => {
                const Icon = item.icon;
                return (
                  <CommandItem
                    key={item.id}
                    value={`${section.label} ${item.name} ${item.to}`}
                    onSelect={() => go(item.to)}
                  >
                    <Icon className="w-3.5 h-3.5 mr-2 text-muted-foreground" />
                    <span>{item.name}</span>
                    {section.aal2 && (
                      <CommandShortcut className="text-[9px] tracking-[0.2em] text-destructive/80 font-black">
                        AAL2
                      </CommandShortcut>
                    )}
                  </CommandItem>
                );
              })}
            </CommandGroup>
          ))}
        </CommandList>
      </CommandDialog>
    </>
  );
}

export default memo(AdminCommandTriggerBase);
