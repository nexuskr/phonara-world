import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import Layout from "@/components/Layout";
import { useDB, formatKRW, uid, type Mission, type MissionTier } from "@/lib/store";
import { ShieldCheck, Users, TrendingUp, ArrowDownToLine, ArrowUpFromLine, X, Plus, MessageSquare, Send, Coins, Target, Crown, BarChart3, ShieldAlert } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useRequireAdmin } from "@/hooks/use-require-auth";
import WithdrawRequestsAdmin from "@/components/admin/WithdrawRequestsAdmin";
import PackagePurchasesAdmin from "@/components/admin/PackagePurchasesAdmin";
import ServerUserAdmin from "@/components/admin/ServerUserAdmin";
import DepositRequestsAdmin from "@/components/admin/DepositRequestsAdmin";
import AdminDashboardCharts from "@/components/admin/AdminDashboardCharts";
import AdvancedAnalytics from "@/components/admin/AdvancedAnalytics";
import ErrorMonitorAdmin from "@/components/admin/ErrorMonitorAdmin";

type Tab = "dashboard" | "analytics" | "errors" | "server_dep" | "server_wd" | "packages" | "users" | "missions" | "chats" | "coin";

export default function Admin() {
  const [db, setDb] = useDB();
  const nav = useNavigate();
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
          <h1 className="font-display font-black text-2xl mt-3">접근 권한 없음</h1>
          <p className="text-xs text-muted-foreground">관리자 계정으로 로그인하세요. (admin@phonara.world)</p>
        </div>
      </Layout>
    );
  }

  const totalUsers = kpi.users;
  const totalDeposits = kpi.deposits;
  const pendingDep = kpi.pendingDep;
  const pendingWd = kpi.pendingWd;


  const tabs: { id: Tab; label: string; icon: any }[] = [
    { id: "dashboard", label: "대시보드", icon: BarChart3 },
    { id: "analytics", label: "고급 분석", icon: TrendingUp },
    { id: "errors", label: "에러 로그", icon: ShieldAlert },
    { id: "server_dep", label: "충전 신청", icon: ArrowUpFromLine },
    { id: "server_wd", label: "출금 신청", icon: ArrowDownToLine },
    { id: "packages", label: "패키지", icon: Crown },
    { id: "missions", label: "미션", icon: Target },
    { id: "users", label: "회원", icon: Users },
    { id: "chats", label: "채팅", icon: MessageSquare },
    { id: "coin", label: "코인설정", icon: Coins },
  ];

  return (
    <Layout>
      <div className="container pt-6 pb-10 animate-liquid-in">
        <div className="flex items-center gap-2 mb-5">
          <ShieldCheck className="w-5 h-5 text-gold" />
          <h1 className="font-display font-black text-2xl text-gradient-gold">관리자 대시보드</h1>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
          <KPI icon={Users} label="총 회원" v={totalUsers.toString()} />
          <KPI icon={TrendingUp} label="누적 충전" v={formatKRW(totalDeposits)} />
          <KPI icon={ArrowUpFromLine} label="충전 대기" v={pendingDep.toString()} hot={pendingDep > 0} />
          <KPI icon={ArrowDownToLine} label="출금 대기" v={pendingWd.toString()} hot={pendingWd > 0} />
        </div>

        <div className="flex gap-2 mb-4 overflow-x-auto -mx-5 px-5 pb-1">
          {tabs.map((t) => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`shrink-0 px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition ${tab === t.id ? "bg-gradient-gold text-gold-foreground glow-gold" : "glass text-muted-foreground"}`}>
              <t.icon className="w-3.5 h-3.5" /> {t.label}
            </button>
          ))}
        </div>

        {tab === "dashboard" && <AdminDashboardCharts />}
        {tab === "analytics" && <AdvancedAnalytics />}
        {tab === "errors" && <ErrorMonitorAdmin />}
        {tab === "server_wd" && <WithdrawRequestsAdmin />}
        {tab === "server_dep" && <DepositRequestsAdmin />}
        {tab === "packages" && <PackagePurchasesAdmin />}
        {tab === "missions" && <MissionAdmin />}
        {tab === "users" && <ServerUserAdmin />}
        {tab === "chats" && <ChatAdmin />}
        {tab === "coin" && <CoinAdmin />}
      </div>
    </Layout>
  );
}

function MissionAdmin() {
  const [db, setDb] = useDB();
  const [form, setForm] = useState<Partial<Mission>>({ title: "", desc: "", reward: 1000, category: "광고", difficulty: "EASY", tier: "NORMAL", duration: "5분" });
  function add() {
    if (!form.title || !form.desc) { toast({ title: "제목/설명 필수" }); return; }
    setDb(d => ({ ...d, customMissions: [{ id: uid(), ...form } as Mission, ...d.customMissions] }));
    toast({ title: "미션 추가됨" });
    setForm({ title: "", desc: "", reward: 1000, category: "광고", difficulty: "EASY", tier: "NORMAL", duration: "5분" });
  }
  function bulk() {
    const sample = [
      { title: "AI 라벨링 50건", desc: "이미지 분류 50건", reward: 8000, category: "데이터" as const, difficulty: "NORMAL" as const, tier: "VIP" as MissionTier, duration: "30분" },
      { title: "GOD 모드 영상 검토", desc: "AI 영상 품질 평가", reward: 95000, category: "AI" as const, difficulty: "HARD" as const, tier: "GOD" as MissionTier, duration: "60분" },
    ];
    setDb(d => ({ ...d, customMissions: [...sample.map(s => ({ id: uid(), ...s })), ...d.customMissions] }));
    toast({ title: "샘플 일괄 등록 완료" });
  }
  return (
    <div className="space-y-3">
      <div className="glass-strong rounded-2xl p-4 neon-border space-y-2">
        <h3 className="font-display font-bold text-sm flex items-center gap-2"><Plus className="w-4 h-4 text-primary" /> 미션 생성</h3>
        <input placeholder="제목" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} className="w-full bg-input/60 border border-border rounded-xl px-3 py-2 text-sm" />
        <textarea placeholder="설명" value={form.desc} onChange={e => setForm(f => ({ ...f, desc: e.target.value }))} className="w-full bg-input/60 border border-border rounded-xl px-3 py-2 text-sm" />
        <div className="grid grid-cols-2 gap-2">
          <input type="number" placeholder="보상" value={form.reward} onChange={e => setForm(f => ({ ...f, reward: Number(e.target.value) }))} className="bg-input/60 border border-border rounded-xl px-3 py-2 text-sm" />
          <input placeholder="소요시간" value={form.duration} onChange={e => setForm(f => ({ ...f, duration: e.target.value }))} className="bg-input/60 border border-border rounded-xl px-3 py-2 text-sm" />
          <select value={form.tier} onChange={e => setForm(f => ({ ...f, tier: e.target.value as MissionTier }))} className="bg-input/60 border border-border rounded-xl px-3 py-2 text-sm">
            {["NORMAL", "VIP", "GOD", "EMPIRE"].map(t => <option key={t}>{t}</option>)}
          </select>
          <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value as any }))} className="bg-input/60 border border-border rounded-xl px-3 py-2 text-sm">
            {["광고", "설문", "리뷰", "추천", "데이터", "AI", "UGC"].map(t => <option key={t}>{t}</option>)}
          </select>
        </div>
        <div className="flex gap-2">
          <button onClick={add} className="flex-1 py-2.5 rounded-xl bg-gradient-primary text-primary-foreground font-bold text-xs">추가</button>
          <button onClick={bulk} className="px-4 py-2.5 rounded-xl glass text-xs font-bold">샘플 일괄</button>
        </div>
      </div>
      <div className="space-y-2">
        {db.customMissions.map(m => (
          <div key={m.id} className="glass rounded-2xl p-3 flex items-center justify-between">
            <div>
              <div className="text-sm font-bold">{m.title} <span className="text-[10px] text-gold">[{m.tier}]</span></div>
              <div className="text-[10px] text-muted-foreground">{m.category} · {formatKRW(m.reward)}</div>
            </div>
            <button onClick={() => setDb(d => ({ ...d, customMissions: d.customMissions.filter(x => x.id !== m.id) }))}
              className="text-destructive text-xs">삭제</button>
          </div>
        ))}
      </div>
    </div>
  );
}


type ST = { id: string; user_id: string; nickname: string; last_message: string | null; last_message_at: string };
type SM = { id: string; thread_id: string; user_id: string; sender: "user" | "admin"; message: string; created_at: string };

function ChatAdmin() {
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
        {threads.length === 0 && <div className="text-xs text-muted-foreground p-3">대화 없음</div>}
        {threads.map(t => (
          <button key={t.id} onClick={() => setActive(t)} className={`w-full text-left p-2 rounded-lg text-xs ${active?.id === t.id ? "bg-gradient-primary/15" : ""}`}>
            <div className="font-bold">{t.nickname}</div>
            <div className="text-[10px] text-muted-foreground truncate">{t.last_message || "—"}</div>
            <div className="text-[10px] text-muted-foreground">{new Date(t.last_message_at).toLocaleTimeString("ko-KR")}</div>
          </button>
        ))}
      </div>
      <div className="glass-strong rounded-2xl neon-border flex flex-col h-96">
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {!active && <div className="text-center text-xs text-muted-foreground mt-10">왼쪽에서 대화를 선택하세요</div>}
          {msgs.map(m => (
            <div key={m.id} className={`flex ${m.sender === "admin" ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[78%] px-3 py-2 rounded-xl text-xs ${m.sender === "admin" ? "bg-gradient-gold text-gold-foreground" : "glass"}`}>{m.message}</div>
            </div>
          ))}
        </div>
        {active && (
          <div className="border-t border-border/40 p-2 flex gap-2">
            <input value={text} onChange={e => setText(e.target.value)} onKeyDown={e => e.key === "Enter" && reply()}
              className="flex-1 bg-input/60 border border-border rounded-lg px-3 py-2 text-sm" placeholder="응답 입력" />
            <button onClick={reply} className="w-9 h-9 rounded-lg bg-gradient-primary text-primary-foreground flex items-center justify-center"><Send className="w-3.5 h-3.5" /></button>
          </div>
        )}
      </div>
    </div>
  );
}

function CoinAdmin() {
  return (
    <div className="glass-strong rounded-2xl p-6 neon-border text-center">
      <Coins className="w-8 h-8 text-secondary mx-auto" />
      <h3 className="font-display font-bold text-sm mt-2">코인 입금 주소 관리</h3>
      <p className="text-xs text-muted-foreground mt-2">
        입금 주소/네트워크는 환경변수 또는 서버 설정으로 관리됩니다.<br/>
        변경이 필요하면 운영팀에 문의해주세요.
      </p>
    </div>
  );
}

function KPI({ icon: Icon, label, v, hot }: any) {
  return (
    <div className={`glass-strong rounded-2xl p-4 ${hot ? "neon-border animate-pulse-glow" : ""}`}>
      <Icon className="w-4 h-4 text-gold" />
      <div className="text-[10px] text-muted-foreground mt-2">{label}</div>
      <div className="font-display font-black text-lg mt-0.5">{v}</div>
    </div>
  );
}
function Status({ status }: { status: string }) {
  const m: any = { pending: ["대기", "text-gold bg-gold/15"], approved: ["승인", "text-secondary bg-secondary/15"], rejected: ["거절", "text-destructive bg-destructive/15"] };
  return <span className={`text-[10px] px-2 py-1 rounded-full font-bold ${m[status][1]}`}>{m[status][0]}</span>;
}
function Empty() { return <div className="glass rounded-2xl p-10 text-center text-sm text-muted-foreground">데이터가 없습니다</div>; }
