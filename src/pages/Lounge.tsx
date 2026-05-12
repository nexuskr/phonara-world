import { useEffect, useState, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Crown, Sword, Shield, Users, Send, Plus, Trophy, Flame, Eye } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useRequireAuth } from "@/hooks/use-require-auth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { LoadingList } from "@/components/ui/loading-state";
import { EmptyState } from "@/components/ui/empty-state";
import { notify } from "@/lib/notify";
import Layout from "@/components/Layout";
import GuildLiveFeed from "@/components/lounge/GuildLiveFeed";
import SeasonPrizePool from "@/components/lounge/SeasonPrizePool";
import GuildRankingPanel from "@/components/guild/GuildRankingPanel";

type Guild = {
  id: string;
  name: string;
  emblem: string;
  total_power: number;
  member_count: number;
  max_members: number;
  description: string | null;
  leader_id: string;
  is_seed?: boolean;
};

type ChatMsg = { id: string; user_id: string | null; message: string; created_at: string; is_bot?: boolean; bot_nickname?: string | null; bot_emoji?: string | null };

type War = {
  id: string;
  attacker_guild_id: string;
  defender_guild_id: string;
  attacker_score: number;
  defender_score: number;
  status: string;
  ends_at: string;
};

export default function Lounge() {
  const user = useRequireAuth();
  const [loading, setLoading] = useState(true);
  const [myGuild, setMyGuild] = useState<Guild | null>(null);
  const [leaderboard, setLeaderboard] = useState<Guild[]>([]);
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [wars, setWars] = useState<War[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [newName, setNewName] = useState("");
  const [newEmblem, setNewEmblem] = useState("🏰");
  const chatEndRef = useRef<HTMLDivElement>(null);

  const guildById = useMemo(() => {
    const m: Record<string, Guild> = {};
    leaderboard.forEach((g) => (m[g.id] = g));
    if (myGuild) m[myGuild.id] = myGuild;
    return m;
  }, [leaderboard, myGuild]);

  async function loadAll() {
    setLoading(true);
    try {
      const { data: lb } = await supabase
        .from("guilds")
        .select("id, name, emblem, total_power, member_count, max_members, description, leader_id, is_seed")
        .order("total_power", { ascending: false })
        .limit(30);
      const lbList: Guild[] = ((lb ?? []) as any[]).map((r) => ({
        id: r.id,
        name: r.name,
        emblem: r.emblem,
        total_power: Number(r.total_power),
        member_count: r.member_count,
        max_members: r.max_members,
        description: r.description,
        leader_id: r.leader_id,
        is_seed: !!r.is_seed,
      }));
      setLeaderboard(lbList);

      if (user?.id) {
        const { data: mem } = await supabase
          .from("guild_members")
          .select("guild_id")
          .eq("user_id", user.id)
          .maybeSingle();
        if (mem?.guild_id) {
          const { data: g } = await supabase
            .from("guilds")
            .select("*")
            .eq("id", mem.guild_id)
            .maybeSingle();
          if (g) setMyGuild(g as Guild);
          const { data: msgs } = await supabase
            .from("guild_chat_messages")
            .select("*")
            .eq("guild_id", mem.guild_id)
            .order("created_at", { ascending: false })
            .limit(50);
          setMessages(((msgs ?? []) as ChatMsg[]).reverse());
        } else {
          setMyGuild(null);
          setMessages([]);
        }
      }

      const { data: warList } = await supabase
        .from("guild_wars")
        .select("*")
        .eq("status", "active")
        .order("started_at", { ascending: false })
        .limit(10);
      setWars((warList ?? []) as War[]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
  }, [user?.id]);

  useEffect(() => {
    if (!myGuild) return;
    const ch = supabase
      .channel(`guild-${myGuild.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "guild_chat_messages", filter: `guild_id=eq.${myGuild.id}` },
        (payload) => setMessages((prev) => [...prev, payload.new as ChatMsg]),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [myGuild?.id]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  async function handleCreate() {
    if (!user) return notify.error("로그인이 필요합니다");
    if (newName.trim().length < 2) return notify.error("길드명은 2자 이상");
    const { data, error } = await supabase.rpc("create_guild", {
      _name: newName.trim(),
      _emblem: newEmblem || "🏰",
      _description: null,
    });
    if (error) return notify.error(`길드 생성 실패: ${error.message}`);
    notify.success("길드 창설 완료!", { description: "이제 영토를 확장하세요" });
    setNewName("");
    loadAll();
  }

  async function handleJoin(gid: string) {
    if (!user) return notify.error("로그인이 필요합니다");
    const { error } = await supabase.rpc("join_guild", { _guild_id: gid });
    if (error) return notify.error(`가입 실패: ${error.message}`);
    notify.success("길드 가입 완료");
    loadAll();
  }

  async function handleLeave() {
    const isLeader = myGuild?.leader_id === user?.id;
    const msg = isLeader
      ? "길드 마스터가 떠나면 기여도 1위 멤버에게 리더십이 승계됩니다.\n(혼자라면 길드가 해체됩니다)\n\n정말 떠나시겠어요?"
      : "길드를 떠나시겠어요?";
    if (!confirm(msg)) return;
    const { error } = await supabase.rpc("leave_guild");
    if (error) {
      const map: Record<string, string> = {
        not_in_guild: "가입한 길드가 없습니다",
        auth_required: "로그인이 필요합니다",
      };
      return notify.error(map[error.message] ?? `탈퇴 실패: ${error.message}`);
    }
    notify.success(isLeader ? "길드를 떠났습니다 (리더십 승계 완료)" : "길드를 떠났습니다");
    setMyGuild(null);
    loadAll();
  }

  async function handleDeleteGuild() {
    if (!myGuild) return;
    const confirmName = window.prompt(
      `⚠️ 길드를 완전히 해체합니다.\n\n채팅, 멤버, 전쟁 기록이 모두 삭제됩니다.\n되돌릴 수 없습니다.\n\n확인을 위해 길드명을 입력하세요:\n"${myGuild.name}"`,
    );
    if (confirmName === null) return;
    if (confirmName.trim() !== myGuild.name) {
      return notify.error("길드명이 일치하지 않아 해체가 취소되었습니다");
    }
    const { error } = await supabase.rpc("delete_guild");
    if (error) {
      const map: Record<string, string> = {
        not_leader: "길드 마스터만 해체할 수 있습니다",
        active_war_in_progress: "진행 중인 전쟁이 끝난 뒤 해체할 수 있습니다",
        auth_required: "로그인이 필요합니다",
      };
      return notify.error(map[error.message] ?? `해체 실패: ${error.message}`);
    }
    notify.success("길드가 해체되었습니다");
    setMyGuild(null);
    loadAll();
  }

  async function handleSend() {
    const msg = chatInput.trim();
    if (!msg) return;
    const { error } = await supabase.rpc("send_guild_message", { _message: msg });
    if (error) return notify.error(`전송 실패: ${error.message}`);
    setChatInput("");
  }

  async function handleDeclareWar(defenderId: string) {
    const { error } = await supabase.rpc("declare_guild_war", { _defender_guild_id: defenderId });
    if (error) return notify.error(`전쟁 선언 실패: ${error.message}`);
    notify.success("⚔️ 전쟁 선언 완료!", { description: "24시간 안에 점령하세요" });
    loadAll();
  }

  async function handleContribute(warId: string) {
    const score = 100 + Math.floor(Math.random() * 400);
    const { error } = await supabase.rpc("contribute_guild_war", { _war_id: warId, _score: score });
    if (error) return notify.error(`기여 실패: ${error.message}`);
    notify.success(`🔥 +${score} 전투력 기여!`);
    loadAll();
  }

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 text-center"
        >
          <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent mb-2">
            🏰 제국 라운지
          </h1>
          <p className="text-muted-foreground">길드를 창설하고, 영토를 확장하고, 명예의 전당에 오르세요</p>
        </motion.div>

        {loading ? (
          <LoadingList rows={4} />
        ) : (
          <div className="grid gap-6 lg:grid-cols-3">
            {/* My Guild + Chat */}
            <div className="lg:col-span-2 space-y-6">
              {myGuild ? (
                <>
                  <Card className="p-6 border-primary/30 bg-gradient-to-br from-card to-primary/5">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-4">
                        <motion.div
                          animate={{ rotate: [0, -5, 5, 0] }}
                          transition={{ duration: 2, repeat: Infinity }}
                          className="text-6xl"
                        >
                          {myGuild.emblem}
                        </motion.div>
                        <div>
                          <h2 className="text-2xl font-bold flex items-center gap-2">
                            {myGuild.name}
                            {myGuild.leader_id === user?.id && (
                              <Crown className="h-5 w-5 text-primary" />
                            )}
                          </h2>
                          <div className="flex gap-3 mt-2 text-sm">
                            <Badge variant="secondary">
                              <Users className="h-3 w-3 mr-1" />
                              {myGuild.member_count}/{myGuild.max_members}
                            </Badge>
                            <Badge className="bg-primary/20 text-primary">
                              <Flame className="h-3 w-3 mr-1" />
                              {myGuild.total_power.toLocaleString()} 전투력
                            </Badge>
                          </div>
                        </div>
                      </div>
                      {myGuild.leader_id === user?.id ? (
                        <div className="flex flex-col gap-2 sm:flex-row">
                          <Button variant="outline" size="sm" onClick={handleLeave}>
                            리더 탈퇴 (승계)
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={handleDeleteGuild}
                            className="shadow-[0_0_18px_-6px_hsl(var(--destructive)/0.6)]"
                          >
                            길드 해체
                          </Button>
                        </div>
                      ) : (
                        <Button variant="outline" size="sm" onClick={handleLeave}>
                          탈퇴
                        </Button>
                      )}
                    </div>
                  </Card>

                  <Card className="p-0 overflow-hidden">
                    <div className="border-b border-border p-4 bg-muted/30">
                      <h3 className="font-semibold flex items-center gap-2">
                        <Users className="h-4 w-4" /> 길드 채팅
                      </h3>
                    </div>
                    <div className="h-80 overflow-y-auto p-4 space-y-2">
                      {messages.length === 0 ? (
                        <EmptyState
                          icon={<Users className="h-6 w-6" />}
                          title="첫 메시지를 보내세요"
                          description="길드원과 작전을 공유하세요"
                        />
                      ) : (
                        <AnimatePresence initial={false}>
                          {messages.map((m) => {
                            const mine = !!user && m.user_id === user.id;
                            const bot = !!m.is_bot;
                            return (
                              <motion.div
                                key={m.id}
                                initial={{ opacity: 0, y: 8 }}
                                animate={{ opacity: 1, y: 0 }}
                                className={`flex ${mine ? "justify-end" : "justify-start"}`}
                              >
                                <div
                                  className={`max-w-[78%] rounded-lg px-3 py-2 text-sm ${
                                    mine ? "bg-primary text-primary-foreground" : "bg-muted"
                                  }`}
                                >
                                  {!mine && bot && (
                                    <div className="flex items-center gap-1.5 mb-0.5">
                                      <span className="text-xs">{m.bot_emoji ?? "🤖"}</span>
                                      <span className="text-[11px] font-semibold text-muted-foreground">{m.bot_nickname}</span>
                                      <span
                                        title="AI persona"
                                        className="inline-block w-1.5 h-1.5 rounded-full bg-muted-foreground/60"
                                      />
                                    </div>
                                  )}
                                  {m.message}
                                </div>
                              </motion.div>
                            );
                          })}
                        </AnimatePresence>
                      )}
                      <div ref={chatEndRef} />
                    </div>
                    <div className="border-t border-border p-3 flex gap-2">
                      <Input
                        value={chatInput}
                        onChange={(e) => setChatInput(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleSend()}
                        placeholder="메시지를 입력하세요..."
                        maxLength={500}
                      />
                      <Button onClick={handleSend} size="icon">
                        <Send className="h-4 w-4" />
                      </Button>
                    </div>
                  </Card>

                  {wars.length > 0 && (
                    <Card className="p-6 border-destructive/30">
                      <h3 className="font-semibold mb-4 flex items-center gap-2">
                        <Sword className="h-5 w-5 text-destructive" /> 진행 중인 전쟁
                      </h3>
                      <div className="space-y-3">
                        {wars
                          .filter(
                            (w) =>
                              w.attacker_guild_id === myGuild.id ||
                              w.defender_guild_id === myGuild.id,
                          )
                          .map((w) => {
                            const att = guildById[w.attacker_guild_id];
                            const def = guildById[w.defender_guild_id];
                            const total = w.attacker_score + w.defender_score || 1;
                            const attPct = (w.attacker_score / total) * 100;
                            return (
                              <div key={w.id} className="space-y-2">
                                <div className="flex justify-between text-sm">
                                  <span>
                                    {att?.emblem} {att?.name ?? "?"}{" "}
                                    <span className="text-primary font-bold">
                                      {w.attacker_score}
                                    </span>
                                  </span>
                                  <span>
                                    <span className="text-destructive font-bold">
                                      {w.defender_score}
                                    </span>{" "}
                                    {def?.name ?? "?"} {def?.emblem}
                                  </span>
                                </div>
                                <div className="h-2 bg-destructive/20 rounded-full overflow-hidden">
                                  <motion.div
                                    className="h-full bg-primary"
                                    initial={{ width: 0 }}
                                    animate={{ width: `${attPct}%` }}
                                  />
                                </div>
                                <Button
                                  size="sm"
                                  className="w-full"
                                  onClick={() => handleContribute(w.id)}
                                >
                                  <Flame className="h-4 w-4 mr-1" /> 전투 참여 (+전투력)
                                </Button>
                              </div>
                            );
                          })}
                      </div>
                    </Card>
                  )}
                </>
              ) : (
                <>
                  <Card className="p-6 border-primary/30 bg-gradient-to-br from-card to-primary/5">
                    <div className="flex items-center gap-2 text-[10px] font-black tracking-[0.3em] text-primary mb-2">
                      <Flame className="h-3 w-3 animate-pulse" /> 지금 1만 명+ 활동 중
                    </div>
                    <h3 className="text-xl font-bold mb-2">🏰 당신만의 길드를 창설하세요</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      이미 50개 길드가 한반도를 분할 점령했습니다.<br />
                      늦기 전에 깃발을 꽂으세요. 길드장은 매주 분배금 +30%.
                    </p>
                    <div className="flex gap-2 mb-3">
                      <Input
                        placeholder="이모지"
                        value={newEmblem}
                        onChange={(e) => setNewEmblem(e.target.value.slice(0, 2))}
                        className="w-20 text-center text-2xl"
                      />
                      <Input
                        placeholder="길드 이름 (예: 서초빅스타)"
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                        maxLength={30}
                      />
                    </div>
                    <Button onClick={handleCreate} className="w-full">
                      <Plus className="h-4 w-4 mr-1" /> 길드 창설하기
                    </Button>
                  </Card>
                  <GuildLiveFeed />
                </>
              )}
            </div>

            {/* Leaderboard */}
            <div className="space-y-4">
              <SeasonPrizePool />
              <GuildRankingPanel />
              <Card className="p-4">
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <Trophy className="h-4 w-4 text-primary" /> 명예의 전당
                </h3>
                {leaderboard.length === 0 ? (
                  <EmptyState
                    icon={<Trophy className="h-6 w-6" />}
                    title="첫 길드를 만들어보세요"
                    description="명예의 전당 1위는 당신의 것"
                  />
                ) : (
                  <div className="space-y-2">
                    {leaderboard.map((g, i) => (
                      <motion.div
                        key={g.id}
                        initial={{ opacity: 0, x: 8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.02 }}
                        className="flex items-center gap-3 p-2 rounded-md hover:bg-muted/50 transition-colors"
                      >
                        <span
                          className={`text-sm font-bold w-6 text-center ${
                            i === 0
                              ? "text-primary"
                              : i < 3
                                ? "text-accent"
                                : "text-muted-foreground"
                          }`}
                        >
                          {i + 1}
                        </span>
                        <span className="text-xl">{g.emblem}</span>
                        <div className="flex-1 min-w-0">
                          <div className="truncate font-medium text-sm">{g.name}</div>
                          <div className="text-xs text-muted-foreground">
                            ⚔️ {g.total_power.toLocaleString()} · {g.member_count}명
                          </div>
                        </div>
                        {!myGuild && !g.is_seed && g.member_count < g.max_members && (
                          <Button size="sm" variant="ghost" onClick={() => handleJoin(g.id)}>
                            가입
                          </Button>
                        )}
                        {!myGuild && g.is_seed && (
                          <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground px-2 py-1 rounded-md bg-muted/50">
                            <Eye className="h-3 w-3" /> 관전
                          </span>
                        )}
                        {myGuild && myGuild.id !== g.id && !g.is_seed && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-destructive hover:text-destructive"
                            onClick={() => handleDeclareWar(g.id)}
                            title="전쟁 선언"
                          >
                            <Sword className="h-3 w-3" />
                          </Button>
                        )}
                      </motion.div>
                    ))}
                  </div>
                )}
              </Card>

              <Card className="p-4 bg-gradient-to-br from-primary/10 to-accent/5 border-primary/30">
                <div className="flex items-center gap-2 mb-2">
                  <Shield className="h-4 w-4 text-primary" />
                  <span className="font-semibold text-sm">길드 시스템 안내</span>
                </div>
                <ul className="text-xs text-muted-foreground space-y-1">
                  <li>• 길드원 최대 30명</li>
                  <li>• 전쟁은 24시간 진행</li>
                  <li>• 기여도가 명예의 전당 순위 결정</li>
                  <li>• 1위 길드 매주 보상 지급</li>
                </ul>
              </Card>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
