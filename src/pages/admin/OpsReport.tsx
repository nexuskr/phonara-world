import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

import { useRequireAdmin } from "@/hooks/use-require-auth";
import { LoadingList } from "@/components/ui/loading-state";
import { EmptyState } from "@/components/ui/empty-state";
import { notify } from "@/lib/notify";
import { Sparkles, AlertTriangle, CheckCircle2, RefreshCw, FileText } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ko } from "date-fns/locale";

type Report = {
  id: string;
  report_date: string;
  model: string;
  summary: string;
  highlights: string[];
  risks: Array<{ title: string; severity: string; detail: string }>;
  actions: string[];
  created_at: string;
};

const sevTone: Record<string, string> = {
  low: "text-muted-foreground border-border",
  medium: "text-secondary border-secondary/40",
  high: "text-destructive border-destructive/40",
};

export default function OpsReport() {
  useRequireAdmin();
  const [reports, setReports] = useState<Report[] | null>(null);
  const [running, setRunning] = useState(false);

  async function load() {
    const { data, error } = await supabase
      .from("ai_daily_ops_reports")
      .select("*")
      .order("report_date", { ascending: false })
      .limit(14);
    if (error) { notify.error("리포트 로드 실패", { description: error.message }); return; }
    setReports((data ?? []) as any);
  }

  useEffect(() => { load(); }, []);

  async function runNow() {
    setRunning(true);
    try {
      const { data, error } = await supabase.functions.invoke("ai-daily-ops-report");
      if (error) throw error;
      if ((data as any)?.skipped) {
        notify.info("오늘 리포트는 이미 생성됨");
      } else {
        notify.success("AI 일일 리포트 생성 완료");
      }
      await load();
    } catch (e: any) {
      notify.error("생성 실패", { description: e?.message ?? String(e) });
    } finally {
      setRunning(false);
    }
  }

  return (
    <>
      <div className="max-w-5xl mx-auto p-4 md:p-6 space-y-6">
        <header className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
              <Sparkles className="text-primary" /> AI Daily Ops Report
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Gemini Flash가 지난 24시간 에러·이상감지·운영 지표를 매일 요약합니다.
            </p>
          </div>
          <button
            onClick={runNow}
            disabled={running}
            className="px-4 py-2 rounded-lg bg-primary text-primary-foreground font-medium disabled:opacity-50 flex items-center gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${running ? "animate-spin" : ""}`} />
            {running ? "생성 중..." : "지금 생성"}
          </button>
        </header>

        {reports === null ? (
          <LoadingList rows={4} />
        ) : reports.length === 0 ? (
          <EmptyState
            icon={<FileText className="h-6 w-6" />}
            title="아직 리포트가 없습니다"
            description="‘지금 생성’ 버튼으로 첫 리포트를 만들어 보세요."
          />
        ) : (
          <div className="space-y-4">
            {reports.map((r) => (
              <article key={r.id} className="rounded-xl border border-border bg-card p-5 space-y-4">
                <header className="flex items-center justify-between gap-2 flex-wrap">
                  <h2 className="text-lg font-semibold">{r.report_date}</h2>
                  <span className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(r.created_at), { addSuffix: true, locale: ko })} · {r.model}
                  </span>
                </header>

                <p className="text-sm md:text-base leading-relaxed">{r.summary}</p>

                {r.highlights?.length > 0 && (
                  <section>
                    <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Highlights
                    </h3>
                    <ul className="text-sm space-y-1 list-disc pl-5">
                      {r.highlights.map((h, i) => <li key={i}>{h}</li>)}
                    </ul>
                  </section>
                )}

                {r.risks?.length > 0 && (
                  <section>
                    <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1">
                      <AlertTriangle className="w-3.5 h-3.5" /> Risks
                    </h3>
                    <ul className="space-y-2">
                      {r.risks.map((risk, i) => (
                        <li key={i} className={`text-sm border-l-2 pl-3 ${sevTone[risk.severity] ?? sevTone.low}`}>
                          <div className="font-medium">{risk.title} <span className="text-xs opacity-70">[{risk.severity}]</span></div>
                          <div className="text-muted-foreground">{risk.detail}</div>
                        </li>
                      ))}
                    </ul>
                  </section>
                )}

                {r.actions?.length > 0 && (
                  <section>
                    <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                      Recommended Actions
                    </h3>
                    <ol className="text-sm space-y-1 list-decimal pl-5">
                      {r.actions.map((a, i) => <li key={i}>{a}</li>)}
                    </ol>
                  </section>
                )}
              </article>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
