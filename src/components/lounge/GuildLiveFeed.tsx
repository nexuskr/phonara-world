import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { motion, AnimatePresence, LazyMotion, domAnimation } from "framer-motion";
import { Flame, Crown, Sword, Coins, TrendingUp, Users, Filter, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type FeedAction = "join" | "contribute" | "war_declare" | "raid_win" | "level_up" | "donate" | "recruit";
type FeedRow = {
  id: string;
  guild_id: string;
  actor_name: string;
  action: FeedAction;
  amount: number | null;
  metadata: { guild_name?: string; guild_emblem?: string } | any;
  created_at: string;
};

const ACTION_META: Record<FeedAction, { icon: any; color: string; label: string; verb: (a: number | null) => string }> = {
  join:         { icon: Users,      color: "text-secondary",    label: "가입",   verb: () => "에 입성했습니다" },
  contribute:   { icon: Flame,      color: "text-primary",      label: "기여",   verb: (a) => `에 +${formatMan(a)}만원 전투력 기여` },
  war_declare:  { icon: Sword,      color: "text-destructive",  label: "전쟁",   verb: () => "에 전쟁 선포!" },
  raid_win:     { icon: Crown,      color: "text-money-strong", label: "승리",   verb: (a) => `전쟁 승리 — +${formatMan(a)}만원 분배` },
  level_up:     { icon: TrendingUp, color: "text-gold",         label: "레벨업", verb: (a) => `Lv.${a ?? 1} 달성` },
  donate:       { icon: Coins,      color: "text-money-strong", label: "후원",   verb: (a) => `금고에 +${formatMan(a)}만원 입금` },
  recruit:      { icon: Crown,      color: "text-gold",         label: "영입",   verb: () => "이(가) 길드장 자리 획득" },
};

const FILTERS: { key: FeedAction | "all" | "mine"; label: string }[] = [
  { key: "all", label: "전체" },
  { key: "join", label: "가입" },
  { key: "contribute", label: "기여" },
  { key: "war_declare", label: "전쟁" },
  { key: "raid_win", label: "승리" },
  { key: "donate", label: "후원" },
  { key: "mine", label: "내 길드" },
];

function formatMan(amount: number | null): string {
  if (!amount) return "0";
  if (amount >= 10000) return Math.floor(amount / 10000).toLocaleString();
  return amount.toString();
}

function relTime(iso: string): string {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 5) return "방금";
  if (diff < 60) return `${Math.floor(diff)}초 전`;
  if (diff < 3600) return `${Math.floor(diff / 60)}분 전`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}시간 전`;
  return `${Math.floor(diff / 86400)}일 전`;
}

const PAGE = 30;

type Props = { myGuildId?: string | null; compact?: boolean };

export default function GuildLiveFeed({ myGuildId, compact = false }: Props) {
  const [rows, setRows] = useState<FeedRow[]>([]);
  const [filter, setFilter] = useState<typeof FILTERS[number]["key"]>("all");
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [paused, setPaused] = useState(false);
  const cursorRef = useRef<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const queryFilter = useCallback((q: any) => {
    if (filter === "mine" && myGuildId) return q.eq("guild_id", myGuildId);
    if (filter !== "all" && filter !== "mine") return q.eq("action", filter);
    return q;
  }, [filter, myGuildId]);

  const loadInitial = useCallback(async () => {
    setLoading(true);
    let q = supabase.from("guild_activity_feed")
      .select("id, guild_id, actor_name, action, amount, metadata, created_at")
      .order("created_at", { ascending: false })
      .limit(PAGE);
    q = queryFilter(q);
    const { data } = await q;
    const list = (data ?? []) as FeedRow[];
    setRows(list);
    cursorRef.current = list.length > 0 ? list[list.length - 1].created_at : null;
    setHasMore(list.length === PAGE);
    setLoading(false);
  }, [queryFilter]);

  useEffect(() => { void loadInitial(); }, [loadInitial]);

  useEffect(() => {
    const channel = supabase
      .channel("guild-activity-live")
      .on("postgres_changes",
        { event: "INSERT", schema: "public", table: "guild_activity_feed" },
        (payload) => {
          const r = payload.new as FeedRow;
          if (filter === "mine" && myGuildId && r.guild_id !== myGuildId) return;
          if (filter !== "all" && filter !== "mine" && r.action !== filter) return;
          if (paused) return;
          setRows((prev) => [r, ...prev].slice(0, 200));
        })
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [filter, myGuildId, paused]);

  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore || !cursorRef.current) return;
    setLoadingMore(true);
    let q = supabase.from("guild_activity_feed")
      .select("id, guild_id, actor_name, action, amount, metadata, created_at")
      .order("created_at", { ascending: false })
      .lt("created_at", cursorRef.current)
      .limit(PAGE);
    q = queryFilter(q);
    const { data } = await q;
    const list = (data ?? []) as FeedRow[];
    setRows((prev) => [...prev, ...list]);
    cursorRef.current = list.length > 0 ? list[list.length - 1].created_at : cursorRef.current;
    setHasMore(list.length === PAGE);
    setLoadingMore(false);
  }, [loadingMore, hasMore, queryFilter]);

  const onScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    setPaused(el.scrollTop > 80);
    if (el.scrollHeight - el.scrollTop - el.clientHeight < 200) {
      void loadMore();
    }
  }, [loadMore]);

  const list = useMemo(() => rows, [rows]);

  return (
    <div className="rounded-2xl border border-border/40 glass-strong overflow-hidden">
      <div className="flex items-center gap-2 px-3 py-2 border-b border-border/40">
        <Flame className="w-3.5 h-3.5 text-primary animate-pulse" />
        <span className="text-[11px] font-black tracking-widest text-primary">실시간 길드 활동</span>
        <span className="ml-auto inline-flex items-center gap-1 text-[10px] text-secondary font-bold">
          <span className={`w-1.5 h-1.5 rounded-full bg-secondary ${paused ? "" : "animate-pulse"}`} />
          {paused ? "일시정지" : "LIVE"}
        </span>
      </div>

      <div className="flex items-center gap-1 overflow-x-auto no-scrollbar px-2 py-2 border-b border-border/40">
        <Filter className="w-3 h-3 text-muted-foreground shrink-0 mx-1" />
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            disabled={f.key === "mine" && !myGuildId}
            className={`shrink-0 px-2.5 py-1 rounded-full text-[10px] font-bold transition-colors ${
              filter === f.key ? "bg-primary text-primary-foreground" : "glass text-muted-foreground hover:text-foreground"
            } disabled:opacity-40`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div
        ref={scrollRef}
        onScroll={onScroll}
        className={`overflow-y-auto ${compact ? "max-h-[220px]" : "max-h-[420px]"}`}
        style={{ scrollbarWidth: "thin" }}
      >
        <LazyMotion features={domAnimation}>
          {loading ? (
            <div className="p-6 flex items-center justify-center text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" />
            </div>
          ) : list.length === 0 ? (
            <div className="p-6 text-center text-xs text-muted-foreground">활동이 없습니다</div>
          ) : (
            <AnimatePresence initial={false}>
              {list.map((r) => {
                const meta = ACTION_META[r.action] ?? ACTION_META.join;
                const Icon = meta.icon;
                const guildName = r.metadata?.guild_name ?? "";
                const emblem = r.metadata?.guild_emblem ?? "🏰";
                return (
                  <motion.div
                    key={r.id}
                    layout
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.25 }}
                    className="flex items-center gap-2 px-3 py-2 border-b border-border/20 last:border-b-0 hover:bg-foreground/[0.02]"
                  >
                    <Icon className={`w-3.5 h-3.5 shrink-0 ${meta.color}`} />
                    <div className="flex-1 min-w-0 text-[11.5px] leading-snug">
                      <span className="font-bold">{r.actor_name}</span>
                      <span className="text-muted-foreground">님이 </span>
                      <span className="text-foreground/90">{emblem} {guildName}</span>
                      <span className={meta.color}>{meta.verb(r.amount)}</span>
                    </div>
                    <span className="text-[9px] text-muted-foreground tabular-nums shrink-0">{relTime(r.created_at)}</span>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          )}
          {loadingMore && (
            <div className="p-3 flex items-center justify-center text-muted-foreground">
              <Loader2 className="w-3 h-3 animate-spin" />
            </div>
          )}
          {!hasMore && list.length > 0 && (
            <div className="p-3 text-center text-[10px] text-muted-foreground">마지막 활동까지 확인했습니다</div>
          )}
        </LazyMotion>
      </div>
    </div>
  );
}
