import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import Layout from "@/components/Layout";
import { useDB, formatKRW, uid, type Mission, type MissionTier } from "@/lib/store";
import { ShieldCheck, Users, TrendingUp, ArrowDownToLine, ArrowUpFromLine, Plus, MessageSquare, Send, Coins, Target, Crown, BarChart3, ShieldAlert, GitBranch } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useRequireAdmin } from "@/hooks/use-require-auth";
import { useTranslation } from "react-i18next";
import { LuxButton, LuxInput, Money } from "@/components/ui/lux";
import { EmptyState } from "@/components/ui/empty-state";
import WithdrawRequestsAdmin from "@/components/admin/WithdrawRequestsAdmin";
import PackagePurchasesAdmin from "@/components/admin/PackagePurchasesAdmin";
import ServerUserAdmin from "@/components/admin/ServerUserAdmin";
import DepositRequestsAdmin from "@/components/admin/DepositRequestsAdmin";
import AdminDashboardCharts from "@/components/admin/AdminDashboardCharts";
import TodayKpiCards from "@/components/admin/TodayKpiCards";
import AdvancedAnalytics from "@/components/admin/AdvancedAnalytics";
import ErrorMonitorAdmin from "@/components/admin/ErrorMonitorAdmin";
import SecurityAuditAdmin from "@/components/admin/SecurityAuditAdmin";
import ObservabilityCockpit from "@/components/admin/ObservabilityCockpit";
import PermissionsAudit from "@/components/admin/PermissionsAudit";
import AdminUgc from "@/components/admin/AdminUgc";
import FunnelAnalytics from "@/components/admin/FunnelAnalytics";
import AMLAdmin from "@/components/admin/AMLAdmin";
import MissionTemplatesAdmin from "@/components/admin/MissionTemplatesAdmin";
import LeaderboardPayoutAudit from "@/components/admin/LeaderboardPayoutAudit";
import ReferralsAdmin from "@/components/admin/ReferralsAdmin";
import ViralForensics from "@/components/admin/ViralForensics";
import InsuranceFundDashboard from "@/components/InsuranceFundDashboard";
import AdminAal2Banner from "@/components/admin/AdminAal2Banner";
import { Activity, Lock, Bot, Flame } from "lucide-react";

type Tab = "dashboard" | "funnel" | "analytics" | "errors" | "security" | "ops" | "perms" | "viral_forensics" | "aml" | "ai_missions" | "payout_audit" | "referrals" | "server_dep" | "server_wd" | "packages" | "users" | "missions" | "chats" | "coin" | "ugc" | "insurance";

export default function Admin() {
  const [db, setDb] = useDB();
  const nav = useNavigate();
  const { t } = useTranslation("admin");
  const user = useRequireAdmin() ?? db.user;
  const [tab, setTab] = useState<Tab>("dashboard");
  const [kpi, setKpi] = useState({ users: 0, deposits: 0, pendingDep: 0, pendingWd: 0 });

  useEffect(() => {
    if (!user?.isAdmin) return;
    let alive = true;
    const load = async () => {
      const [u, dApproved, dPend, wPend] = await Promise.all([
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("deposit_requests").select("amount").eq("status", "approved"),
        supabase.from("deposit_requests").select("id", { count: "exact", head: true }).eq("status", "pending"),
        supabase.from("withdrawal_requests").select("id", { count: "exact", head: true }).eq("status", "pending"),
      ]);
      if (!alive) return;
      const sum = (dApproved.data ?? []).reduce((s: number, x: any) => s + Number(x.amount || 0), 0);
      setKpi({
        users: u.count ?? 0,
        deposits: sum,
        pendingDep: dPend.count ?? 0,
        pendingWd: wPend.count ?? 0,
      });
    };
    load();
    const ch = supabase
      .channel("admin:kpi")
      .on("postgres_changes", { event: "*", schema: "public", table: "deposit_requests" }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "withdrawal_requests" }, load)
      .subscribe();
    return () => { alive = false; supabase.removeChannel(ch); };
  }, [user?.isAdmin]);

  if (!user) return null;
  if (!user.isAdmin) {
    return (
      <Layout>
        <div className="container py-20 text-center">
          <ShieldCheck className="w-12 h-12 text-destructive mx-auto" />
          <h1 className="font-imperial font-black text-2xl mt-3 break-keep">{t("noAccess")}</h1>
          <p className="text-xs text-muted-foreground break-keep">{t("needAdmin")}</p>
        </div>
      </Layout>
    );
  }

  const totalUsers = kpi.users;
  const totalDeposits = kpi.deposits;
  const pendingDep = kpi.pendingDep;
  const pendingWd = kpi.pendingWd;


  const tabs: { id: Tab; label: string; icon: any }[] = [
    { id: "dashboard", label: t("tabDashboard"), icon: BarChart3 },
    { id: "funnel", label: t("tabFunnel"), icon: GitBranch },
    { id: "analytics", label: t("tabAnalytics"), icon: TrendingUp },
    { id: "errors", label: t("tabErrors"), icon: ShieldAlert },
    { id: "security", label: t("tabSecurity"), icon: ShieldCheck },
    { id: "ops", label: t("tabOps"), icon: Activity },
    { id: "perms", label: t("tabPerms"), icon: Lock },
    { id: "viral_forensics", label: "바이럴 감사", icon: Flame },
    { id: "aml", label: "AML 결재", icon: ShieldCheck },
    { id: "ai_missions", label: "AI 미션", icon: Bot },
    { id: "payout_audit", label: "정산검증", icon: Activity },
    { id: "referrals", label: "추천 윈도우", icon: Users },
    { id: "server_dep", label: t("tabDeposits"), icon: ArrowUpFromLine },
    { id: "server_wd", label: t("tabWithdrawals"), icon: ArrowDownToLine },
    { id: "packages", label: t("tabPackages"), icon: Crown },
    { id: "missions", label: t("tabMissions"), icon: Target },
    { id: "users", label: t("tabUsers"), icon: Users },
    { id: "chats", label: t("tabChats"), icon: MessageSquare },
    { id: "coin", label: t("tabCoin"), icon: Coins },
    { id: "ugc", label: "UGC 성과", icon: BarChart3 },
    { id: "insurance", label: "보험펀드", icon: ShieldCheck },
  ];

  return (
    <Layout>
      <div className="container pt-6 pb-10 animate-liquid-in">
        <div className="flex items-center gap-2 mb-5">
          <ShieldCheck className="w-5 h-5 text-primary" />
          <h1 className="font-imperial text-2xl sm:text-3xl tracking-[0.18em] text-gradient-imperial break-keep">{t("title")}</h1>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
          <KPI icon={Users} label={t("kpiUsers")} v={totalUsers.toLocaleString()} />
          <KPI icon={TrendingUp} label={t("kpiDeposit")} v={formatKRW(totalDeposits)} money />
          <KPI icon={ArrowUpFromLine} label={t("kpiPendingDep")} v={pendingDep.toLocaleString()} hot={pendingDep > 0} />
          <KPI icon={ArrowDownToLine} label={t("kpiPendingWd")} v={pendingWd.toLocaleString()} hot={pendingWd > 0} />
        </div>

        <div className="mb-4">
          <AdminAal2Banner />
        </div>
        <div className="flex gap-2 mb-4 overflow-x-auto -mx-5 px-5 pb-1">
          {tabs.map((tt) => (
            <button key={tt.id} onClick={() => setTab(tt.id)}
              className={`shrink-0 px-4 min-h-[44px] rounded-xl text-xs font-bold flex items-center gap-1.5 break-keep whitespace-nowrap transition ${tab === tt.id ? "bg-gradient-gold text-gold-foreground glow-gold" : "glass text-muted-foreground"}`}>
              <tt.icon className="w-3.5 h-3.5" /> {tt.label}
            </button>
          ))}
        </div>

        {tab === "dashboard" && <><TodayKpiCards /><AdminDashboardCharts /></>}
        {tab === "funnel" && <FunnelAnalytics />}
        {tab === "analytics" && <AdvancedAnalytics />}
        {tab === "errors" && <ErrorMonitorAdmin />}
        {tab === "security" && <SecurityAuditAdmin />}
        {tab === "ops" && <ObservabilityCockpit />}
        {tab === "perms" && <PermissionsAudit />}
        {tab === "viral_forensics" && <ViralForensics />}
        {tab === "aml" && <AMLAdmin />}
        {tab === "ai_missions" && <MissionTemplatesAdmin />}
        {tab === "payout_audit" && <LeaderboardPayoutAudit />}
        {tab === "referrals" && <ReferralsAdmin />}
        {tab === "server_wd" && <WithdrawRequestsAdmin />}
        {tab === "server_dep" && <DepositRequestsAdmin />}
        {tab === "packages" && <PackagePurchasesAdmin />}
        {tab === "missions" && <MissionAdmin />}
        {tab === "users" && <ServerUserAdmin />}
        {tab === "chats" && <ChatAdmin />}
        {tab === "coin" && <CoinAdmin />}
        {tab === "ugc" && <AdminUgc />}
        {tab === "insurance" && <InsuranceFundDashboard variant="admin" />}
      </div>
    </Layout>
  );
}

function MissionAdmin() {
  const [db, setDb] = useDB();
  const { t } = useTranslation("admin");
  const [form, setForm] = useState<Partial<Mission>>({ title: "", desc: "", reward: 1000, category: "광고", difficulty: "EASY", tier: "NORMAL", duration: "5분" });
  function add() {
    if (!form.title || !form.desc) { toast({ title: t("requireFields") }); return; }
    setDb(d => ({ ...d, customMissions: [{ id: uid(), ...form } as Mission, ...d.customMissions] }));
    toast({ title: t("missionAdded") });
    setForm({ title: "", desc: "", reward: 1000, category: "광고", difficulty: "EASY", tier: "NORMAL", duration: "5분" });
  }
  function bulk() {
    const sample = [
      { title: "AI 라벨링 50건", desc: "이미지 분류 50건", reward: 8000, category: "데이터" as const, difficulty: "NORMAL" as const, tier: "VIP" as MissionTier, duration: "30분" },
      { title: "GOD 모드 영상 검토", desc: "AI 영상 품질 평가", reward: 95000, category: "AI" as const, difficulty: "HARD" as const, tier: "GOD" as MissionTier, duration: "60분" },
    ];
    setDb(d => ({ ...d, customMissions: [...sample.map(s => ({ id: uid(), ...s })), ...d.customMissions] }));
    toast({ title: t("bulkAdded") });
  }
  return (
    <div className="space-y-3">
      <div className="glass-strong rounded-2xl p-4 neon-border space-y-2">
        <h3 className="font-imperial font-bold text-sm flex items-center gap-2 break-keep"><Plus className="w-4 h-4 text-primary" /> {t("missionCreate")}</h3>
        <LuxInput placeholder={t("title_ph")} value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
        <textarea placeholder={t("desc_ph")} value={form.desc} onChange={e => setForm(f => ({ ...f, desc: e.target.value }))} className="w-full bg-input/70 border border-border/70 rounded-2xl px-4 py-3 text-sm min-h-[88px] focus:outline-none focus:border-primary" />
        <div className="grid grid-cols-2 gap-2">
          <LuxInput type="number" placeholder={t("reward_ph")} value={form.reward} onChange={e => setForm(f => ({ ...f, reward: Number(e.target.value) }))} />
          <LuxInput placeholder={t("duration_ph")} value={form.duration} onChange={e => setForm(f => ({ ...f, duration: e.target.value }))} />
          <select value={form.tier} onChange={e => setForm(f => ({ ...f, tier: e.target.value as MissionTier }))} className="bg-input/70 border border-border/70 rounded-2xl px-3 min-h-[48px] text-sm">
            {["NORMAL", "VIP", "GOD", "EMPIRE"].map(tt => <option key={tt}>{tt}</option>)}
          </select>
          <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value as any }))} className="bg-input/70 border border-border/70 rounded-2xl px-3 min-h-[48px] text-sm">
            {["광고", "설문", "리뷰", "추천", "데이터", "AI", "UGC"].map(tt => <option key={tt}>{tt}</option>)}
          </select>
        </div>
        <div className="flex gap-2">
          <LuxButton variant="primary" size="md" block onClick={add}>{t("add")}</LuxButton>
          <LuxButton variant="ghost" size="md" onClick={bulk}>{t("bulk")}</LuxButton>
        </div>
      </div>
      <div className="space-y-2">
        {db.customMissions.map(m => (
          <div key={m.id} className="glass rounded-2xl p-3 flex items-center justify-between">
            <div className="min-w-0">
              <div className="text-sm font-bold break-keep">{m.title} <span className="text-[10px] text-gold tabular-nums">[{m.tier}]</span></div>
              <div className="text-[10px] text-muted-foreground tabular-nums">{m.category} · {formatKRW(m.reward)}</div>
            </div>
            <button onClick={() => setDb(d => ({ ...d, customMissions: d.customMissions.filter(x => x.id !== m.id) }))}
              className="text-destructive text-xs min-h-[44px] px-3">{t("delete")}</button>
          </div>
        ))}
      </div>
    </div>
  );
}


type ST = { id: string; user_id: string; nickname: string; last_message: string | null; last_message_at: string };
type SM = { id: string; thread_id: string; user_id: string; sender: "user" | "admin"; message: string; created_at: string };

function ChatAdmin() {
  const { t } = useTranslation("admin");
  const { i18n } = useTranslation();
  const dtLocale = (i18n.language || "ko").startsWith("en") ? "en-US" : "ko-KR";
  const [threads, setThreads] = useState<ST[]>([]);
  const [active, setActive] = useState<ST | null>(null);
  const [msgs, setMsgs] = useState<SM[]>([]);
  const [text, setText] = useState("");
  const [adminId, setAdminId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setAdminId(user?.id || null);
      const { data } = await supabase.from("support_threads").select("*").order("last_message_at", { ascending: false });
      setThreads((data as ST[]) || []);
    })();
    const ch = supabase.channel("admin:threads")
      .on("postgres_changes", { event: "*", schema: "public", table: "support_threads" }, async () => {
        const { data } = await supabase.from("support_threads").select("*").order("last_message_at", { ascending: false });
        setThreads((data as ST[]) || []);
      }).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  useEffect(() => {
    if (!active) { setMsgs([]); return; }
    let ch: any;
    (async () => {
      const { data } = await supabase.from("support_messages").select("*")
        .eq("thread_id", active.id).order("created_at", { ascending: true });
      setMsgs((data as SM[]) || []);
      ch = supabase.channel(`admin:msgs:${active.id}`)
        .on("postgres_changes",
          { event: "INSERT", schema: "public", table: "support_messages", filter: `thread_id=eq.${active.id}` },
          (p) => setMsgs(prev => [...prev, p.new as SM])
        ).subscribe();
    })();
    return () => { if (ch) supabase.removeChannel(ch); };
  }, [active?.id]);

  async function reply() {
    if (!active || !text.trim() || !adminId) return;
    const t = text.trim(); setText("");
    await supabase.from("support_messages").insert({
      thread_id: active.id, user_id: active.user_id, sender: "admin", message: t,
    });
    await supabase.from("support_threads").update({
      last_message: t, last_message_at: new Date().toISOString(),
    }).eq("id", active.id);
  }

  return (
    <div className="grid sm:grid-cols-[200px_1fr] gap-3">
      <div className="glass rounded-2xl p-2 space-y-1 max-h-96 overflow-y-auto">
        {threads.length === 0 && <div className="text-xs text-muted-foreground p-3 break-keep">{t("noChat")}</div>}
        {threads.map(th => (
          <button key={th.id} onClick={() => setActive(th)} className={`w-full text-left p-2 min-h-[56px] rounded-lg text-xs ${active?.id === th.id ? "bg-gradient-primary/15" : ""}`}>
            <div className="font-bold break-keep">{th.nickname}</div>
            <div className="text-[10px] text-muted-foreground truncate">{th.last_message || "—"}</div>
            <div className="text-[10px] text-muted-foreground tabular-nums">{new Date(th.last_message_at).toLocaleTimeString(dtLocale)}</div>
          </button>
        ))}
      </div>
      <div className="glass-strong rounded-2xl neon-border flex flex-col h-96">
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {!active && <div className="text-center text-xs text-muted-foreground mt-10 break-keep">{t("pickThread")}</div>}
          {msgs.map(m => (
            <div key={m.id} className={`flex ${m.sender === "admin" ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[78%] px-3 py-2 rounded-xl text-xs ${m.sender === "admin" ? "bg-gradient-gold text-gold-foreground" : "glass"}`}>{m.message}</div>
            </div>
          ))}
        </div>
        {active && (
          <div className="border-t border-border/40 p-2 flex gap-2">
            <LuxInput value={text} onChange={e => setText(e.target.value)} onKeyDown={e => e.key === "Enter" && reply()} placeholder={t("replyPh")} />
            <button onClick={reply} className="w-11 h-11 min-w-[44px] rounded-lg bg-gradient-primary text-primary-foreground flex items-center justify-center"><Send className="w-3.5 h-3.5" /></button>
          </div>
        )}
      </div>
    </div>
  );
}

function CoinAdmin() {
  const { t } = useTranslation("admin");
  return (
    <div className="glass-strong rounded-2xl p-6 neon-border text-center">
      <Coins className="w-8 h-8 text-secondary mx-auto" />
      <h3 className="font-imperial font-bold text-sm mt-2 break-keep">{t("coinTitle")}</h3>
      <p className="text-xs text-muted-foreground mt-2 break-keep">{t("coinDesc")}</p>
    </div>
  );
}

function KPI({ icon: Icon, label, v, hot, money }: any) {
  return (
    <div className={`glass-strong rounded-2xl p-4 ${hot ? "neon-border animate-pulse-glow" : ""}`}>
      <Icon className="w-4 h-4 text-gold" />
      <div className="text-[10px] text-muted-foreground mt-2 break-keep">{label}</div>
      {money
        ? <Money strong className="font-imperial font-black text-lg mt-0.5 block">{v}</Money>
        : <div className="font-imperial font-black text-lg mt-0.5 tabular-nums">{v}</div>}
    </div>
  );
}
function Empty() { return <EmptyState size="sm" variant="muted" />; }
