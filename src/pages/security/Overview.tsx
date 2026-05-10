import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Layout from "@/components/Layout";
import { useRequireAuth } from "@/hooks/use-require-auth";
import {
  ShieldCheck, ShieldAlert, Fingerprint, KeyRound, Mail, Smartphone,
  Lock, CheckCircle2, Circle, AlertTriangle, ChevronRight, BellRing, Activity,
} from "lucide-react";
import { LoadingList } from "@/components/ui/loading-state";
import MyDevices from "@/components/security/MyDevices";

type Status = "complete" | "partial" | "missing";

interface Signal {
  id: string;
  label: string;
  desc: string;
  status: Status;
  weight: number; // contribution to score
  icon: any;
  href?: string;
  cta?: string;
}

export default function SecurityOverview() {
  const user = useRequireAuth();
  const [loading, setLoading] = useState(true);
  const [signals, setSignals] = useState<Signal[]>([]);
  const [score, setScore] = useState(0);
  const [recentEvents, setRecentEvents] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;
    let alive = true;
    (async () => {
      try {
        const { data: authData } = await supabase.auth.getUser();
        const u = authData?.user;
        const { data: factors } = await supabase.auth.mfa.listFactors();
        const totpVerified = (factors?.totp ?? []).some((f: any) => f.status === "verified");
        const { data: passkeys } = await supabase
          .from("user_passkeys" as any)
          .select("id, device_name, last_used_at")
          .order("last_used_at", { ascending: false });
        const passkeyCount = passkeys?.length ?? 0;

        // Recent withdrawal-related events as activity stream
        const { data: wd } = await supabase
          .from("withdrawal_requests")
          .select("id, amount, status, created_at")
          .order("created_at", { ascending: false })
          .limit(5);

        if (!alive) return;

        const list: Signal[] = [
          {
            id: "email",
            label: "이메일 인증",
            desc: u?.email_confirmed_at ? "확인됨" : "미확인 — 인증 메일을 확인해주세요",
            status: u?.email_confirmed_at ? "complete" : "missing",
            weight: 15,
            icon: Mail,
          },
          {
            id: "totp",
            label: "인증 앱 (TOTP)",
            desc: totpVerified ? "등록됨 · 출금/관리자에서 즉시 사용" : "필수 권장 — 출금 강력 인증의 1차 수단",
            status: totpVerified ? "complete" : "missing",
            weight: 35,
            icon: KeyRound,
            href: "/security/totp",
            cta: totpVerified ? "관리" : "지금 등록",
          },
          {
            id: "passkey",
            label: "Passkey (생체 인증)",
            desc: passkeyCount > 0 ? `${passkeyCount}개 등록됨` : "지문/얼굴로 한 번에 강력 인증",
            status: passkeyCount > 0 ? "complete" : "missing",
            weight: 25,
            icon: Fingerprint,
            href: "/security/passkey",
            cta: passkeyCount > 0 ? "관리" : "등록",
          },
          {
            id: "pin",
            label: "출금 비밀번호",
            desc: "6자리 출금 PIN (출금 화면에서 변경)",
            status: "partial",
            weight: 15,
            icon: Lock,
          },
          {
            id: "alerts",
            label: "이메일 알림",
            desc: "출금 상태/이상 활동 알림",
            status: "complete",
            weight: 10,
            icon: BellRing,
          },
        ];

        const earned = list.reduce((s, x) => s + (x.status === "complete" ? x.weight : x.status === "partial" ? x.weight * 0.5 : 0), 0);
        const max = list.reduce((s, x) => s + x.weight, 0);
        setSignals(list);
        setScore(Math.round((earned / max) * 100));
        setRecentEvents(wd ?? []);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [user]);

  if (!user) return null;

  const scoreColor =
    score >= 80 ? "text-success" :
    score >= 50 ? "text-accent" :
    "text-destructive";

  const scoreBg =
    score >= 80 ? "from-success/20 via-success/5 to-transparent border-success/40" :
    score >= 50 ? "from-accent/20 via-accent/5 to-transparent border-accent/40" :
    "from-destructive/20 via-destructive/5 to-transparent border-destructive/40";

  return (
    <Layout>
      <div className="container max-w-3xl pt-6 pb-12 animate-liquid-in space-y-5">
        <header className="flex items-center gap-3">
          <ShieldCheck className="w-6 h-6 text-primary" />
          <h1 className="font-imperial text-2xl sm:text-3xl tracking-[0.18em] text-gradient-imperial">
            보안 센터
          </h1>
        </header>

        {/* Security Score Card */}
        <div className={`rounded-3xl border-2 bg-gradient-to-br ${scoreBg} p-6 sm:p-8`}>
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <div className="text-xs tracking-[0.3em] text-muted-foreground font-bold mb-2">
                SECURITY SCORE
              </div>
              <div className="flex items-baseline gap-1">
                <span className={`font-imperial text-6xl sm:text-7xl font-bold tabular-nums ${scoreColor}`}>
                  {score}
                </span>
                <span className="text-2xl text-muted-foreground font-bold">/100</span>
              </div>
              <div className="text-sm text-muted-foreground mt-2 max-w-sm">
                {score >= 80 ? "최강의 방어선이 구축되어 있습니다."
                  : score >= 50 ? "기본 방어는 갖추었습니다. 한 단계 더 올려보세요."
                  : "취약합니다. 인증 앱(TOTP)을 우선 등록해주세요."}
              </div>
            </div>
            {score >= 80 ? (
              <ShieldCheck className="w-20 h-20 text-success opacity-30" />
            ) : (
              <ShieldAlert className="w-20 h-20 text-destructive opacity-30" />
            )}
          </div>
        </div>

        {/* Signal Checklist */}
        <section className="space-y-3">
          <h2 className="text-xs tracking-[0.25em] font-bold text-muted-foreground">
            보호 항목
          </h2>
          {loading && <LoadingList rows={5} />}
          {!loading && signals.map((s) => (
            <SignalRow key={s.id} signal={s} />
          ))}
        </section>

        {/* Quick recovery actions */}
        <section className="rounded-2xl glass-strong p-5 neon-border">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-4 h-4 text-accent" />
            <h3 className="font-bold text-sm">긴급 복구</h3>
          </div>
          <p className="text-xs text-muted-foreground mb-4 break-keep">
            계정 도용이 의심되거나 인증 수단을 모두 잃었다면 즉시 고객센터로 문의해주세요. 24시간 이내 조치합니다.
          </p>
          <Link
            to="/support"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-destructive/10 border border-destructive/40 text-destructive text-xs font-bold hover:bg-destructive/20 transition"
          >
            <Smartphone className="w-4 h-4" />
            고객센터 문의하기
          </Link>
        </section>

        {/* My Devices */}
        <section>
          <h2 className="text-xs tracking-[0.25em] font-bold text-muted-foreground mb-3">
            <Smartphone className="w-3 h-3 inline mr-1.5" />
            내 디바이스
          </h2>
          <MyDevices />
        </section>

        {/* Recent activity */}
        <section>
          <h2 className="text-xs tracking-[0.25em] font-bold text-muted-foreground mb-3">
            <Activity className="w-3 h-3 inline mr-1.5" />
            최근 활동
          </h2>
          {loading ? <LoadingList rows={3} /> : recentEvents.length === 0 ? (
            <div className="text-xs text-muted-foreground glass-strong rounded-2xl p-4">
              최근 7일간 출금 활동이 없습니다.
            </div>
          ) : (
            <div className="space-y-2">
              {recentEvents.map((e) => (
                <div key={e.id} className="glass-strong rounded-xl p-3 flex items-center justify-between text-xs">
                  <div>
                    <div className="font-bold">출금 신청</div>
                    <div className="text-muted-foreground tabular-nums">
                      {new Date(e.created_at).toLocaleString("ko-KR")}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold tabular-nums">
                      ₩{e.amount.toLocaleString()}
                    </div>
                    <div className="text-muted-foreground capitalize">{e.status}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </Layout>
  );
}

function SignalRow({ signal }: { signal: Signal }) {
  const Icon = signal.icon;
  const StatusIcon =
    signal.status === "complete" ? CheckCircle2 :
    signal.status === "partial" ? Circle :
    AlertTriangle;
  const statusColor =
    signal.status === "complete" ? "text-success" :
    signal.status === "partial" ? "text-muted-foreground" :
    "text-destructive";

  const inner = (
    <div className="flex items-center gap-3 glass-strong rounded-2xl p-4 hover:scale-[1.005] transition">
      <div className={`p-2 rounded-xl ${signal.status === "complete" ? "bg-success/10" : "bg-muted/30"}`}>
        <Icon className={`w-5 h-5 ${signal.status === "complete" ? "text-success" : "text-muted-foreground"}`} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <StatusIcon className={`w-3.5 h-3.5 shrink-0 ${statusColor}`} />
          <div className="font-bold text-sm truncate">{signal.label}</div>
        </div>
        <div className="text-xs text-muted-foreground mt-0.5 break-keep line-clamp-2">{signal.desc}</div>
      </div>
      {signal.href && (
        <div className="text-xs font-bold text-primary flex items-center gap-1 shrink-0">
          {signal.cta ?? "설정"}
          <ChevronRight className="w-3 h-3" />
        </div>
      )}
    </div>
  );

  return signal.href ? <Link to={signal.href}>{inner}</Link> : inner;
}
