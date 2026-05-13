// 관리자 고객지원 허브: 에스컬레이션·미읽음 큐 + KB 업로드 + 라우팅 규칙.
import { useEffect, useState } from "react";

import { supabase } from "@/integrations/supabase/client";
import { useRequireAdmin } from "@/hooks/use-require-auth";
import { LoadingList } from "@/components/ui/loading-state";
import { EmptyState } from "@/components/ui/empty-state";
import { notify } from "@/lib/notify";
import { Inbox, AlertTriangle, CheckCircle2, Upload, FileText, RefreshCw, Sparkles, Trash2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ko } from "date-fns/locale";

type Thread = {
  id: string;
  user_id: string;
  nickname: string;
  last_message: string | null;
  last_message_at: string;
  unread_admin: number;
  status: string;
  priority: string;
  ai_escalated: boolean;
  ai_last_category: string | null;
  assigned_to: string | null;
};

type KbArticle = {
  id: string;
  title: string;
  category: string;
  tags: string[];
  active: boolean;
  source_file_path: string | null;
  created_at: string;
};

const PRI_TONE: Record<string, string> = {
  urgent: "bg-destructive/15 text-destructive",
  high: "bg-orange-500/15 text-orange-400",
  normal: "bg-primary/15 text-primary",
  low: "bg-muted/30 text-muted-foreground",
};
const STATUS_LABEL: Record<string, string> = {
  open: "접수", reviewing: "검토 중", resolved: "해결됨", onhold: "보류",
};

export default function AdminSupport() {
  useRequireAdmin();
  const [tab, setTab] = useState<"queue" | "kb">("queue");
  const [threads, setThreads] = useState<Thread[] | null>(null);
  const [filter, setFilter] = useState<"escalated" | "open" | "all">("escalated");
  const [resolving, setResolving] = useState<string | null>(null);

  // KB state
  const [kb, setKb] = useState<KbArticle[] | null>(null);
  const [uploadOpen, setUploadOpen] = useState(false);

  async function loadThreads() {
    let q = supabase
      .from("support_threads")
      .select("id,user_id,nickname,last_message,last_message_at,unread_admin,status,priority,ai_escalated,ai_last_category,assigned_to")
      .order("last_message_at", { ascending: false })
      .limit(100);
    if (filter === "escalated") q = q.eq("ai_escalated", true).neq("status", "resolved");
    else if (filter === "open") q = q.neq("status", "resolved");
    const { data, error } = await q;
    if (error) { notify.error("스레드 로드 실패", { description: error.message }); return; }
    setThreads((data as Thread[]) ?? []);
  }
  async function loadKb() {
    const { data, error } = await supabase
      .from("support_kb_articles")
      .select("id,title,category,tags,active,source_file_path,created_at")
      .order("updated_at", { ascending: false })
      .limit(100);
    if (error) { notify.error("KB 로드 실패", { description: error.message }); return; }
    setKb((data as KbArticle[]) ?? []);
  }

  useEffect(() => {
    loadThreads();
    const ch = supabase.channel("admin-support-threads")
      .on("postgres_changes", { event: "*", schema: "public", table: "support_threads" }, () => loadThreads())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  useEffect(() => { if (tab === "kb") loadKb(); }, [tab]);

  async function resolve(id: string) {
    setResolving(id);
    try {
      const { error } = await (supabase as any).rpc("resolve_support_thread", {
        _thread_id: id, _note: "상담이 완료되었습니다. 추가 문의는 새 채팅으로 보내주세요.",
      });
      if (error) throw error;
      notify.success("티켓 해결 완료");
      await loadThreads();
    } catch (e: any) {
      notify.error("해결 실패", { description: e?.message ?? String(e) });
    } finally {
      setResolving(null);
    }
  }

  async function deleteArticle(id: string) {
    if (!confirm("이 KB 기사를 삭제할까요?")) return;
    const { error } = await supabase.from("support_kb_articles").delete().eq("id", id);
    if (error) { notify.error("삭제 실패", { description: error.message }); return; }
    notify.success("삭제됨");
    await loadKb();
  }

  return (
    <>
      <div className="max-w-5xl mx-auto p-4 md:p-6 space-y-5">
        <header className="flex items-center justify-between gap-3 flex-wrap">
          <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
            <Inbox className="text-primary" /> Support Hub
          </h1>
          <div className="flex gap-2">
            {[
              { id: "queue", label: "큐" },
              { id: "kb", label: "지식베이스" },
            ].map(t => (
              <button key={t.id} onClick={() => setTab(t.id as any)}
                className={`px-3 py-1.5 rounded-lg text-sm font-bold border ${
                  tab === t.id ? "bg-primary text-primary-foreground border-primary" : "border-border bg-card"
                }`}>{t.label}</button>
            ))}
          </div>
        </header>

        {tab === "queue" && (
          <>
            <div className="flex gap-2 flex-wrap">
              {[
                { id: "escalated", label: "에스컬레이션", icon: AlertTriangle },
                { id: "open", label: "미해결 전체", icon: Inbox },
                { id: "all", label: "전체", icon: RefreshCw },
              ].map(f => (
                <button key={f.id} onClick={() => setFilter(f.id as any)}
                  className={`px-3 py-1.5 rounded-full text-xs font-bold border flex items-center gap-1 ${
                    filter === f.id ? "bg-primary/15 border-primary text-primary" : "border-border text-muted-foreground"
                  }`}>
                  <f.icon className="w-3 h-3" /> {f.label}
                </button>
              ))}
            </div>

            {threads === null ? <LoadingList rows={4} /> :
             threads.length === 0 ? (
               <EmptyState icon={<CheckCircle2 className="h-6 w-6" />} title="처리할 티켓이 없습니다"
                 description="에스컬레이션된 문의가 들어오면 여기서 알려드릴게요." />
             ) : (
              <ul className="space-y-2">
                {threads.map(t => (
                  <li key={t.id} className="glass-strong rounded-2xl border border-border/40 p-4">
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className="text-sm font-bold">{t.nickname}</span>
                          <span className="text-[10px] font-bold rounded-full px-2 py-0.5 border border-border/60">
                            {STATUS_LABEL[t.status] ?? t.status}
                          </span>
                          <span className={`text-[10px] font-bold rounded-full px-2 py-0.5 uppercase ${PRI_TONE[t.priority] ?? PRI_TONE.normal}`}>
                            {t.priority}
                          </span>
                          {t.ai_escalated && (
                            <span className="text-[10px] font-bold rounded-full px-2 py-0.5 bg-destructive/15 text-destructive flex items-center gap-1">
                              <AlertTriangle className="w-3 h-3" /> AI 전달
                            </span>
                          )}
                          {t.ai_last_category && (
                            <span className="text-[10px] text-muted-foreground">#{t.ai_last_category}</span>
                          )}
                          {t.unread_admin > 0 && (
                            <span className="bg-primary text-primary-foreground text-[10px] font-bold rounded-full px-2 py-0.5">
                              미읽음 {t.unread_admin}
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground line-clamp-2">{t.last_message ?? "(메시지 없음)"}</p>
                        <p className="text-[10px] text-muted-foreground mt-1">
                          {formatDistanceToNow(new Date(t.last_message_at), { addSuffix: true, locale: ko })}
                        </p>
                      </div>
                      <div className="flex gap-2 shrink-0">
                        <a href="/admin" className="text-xs text-primary underline-offset-4 hover:underline self-center">상세 →</a>
                        <button
                          onClick={() => resolve(t.id)}
                          disabled={resolving === t.id || t.status === "resolved"}
                          className="px-3 py-1.5 rounded-lg bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-xs font-bold disabled:opacity-50 flex items-center gap-1"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          {resolving === t.id ? "처리 중..." : "처리 완료"}
                        </button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}

        {tab === "kb" && (
          <>
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <p className="text-sm text-muted-foreground">
                도움말/정책/오류코드 문서를 업로드해 AI 답변 정확도를 높입니다. (.md, .txt, .html 권장)
              </p>
              <button onClick={() => setUploadOpen(true)}
                className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-sm font-bold flex items-center gap-1">
                <Upload className="w-4 h-4" /> 문서 업로드
              </button>
            </div>

            {uploadOpen && <KbUpload onClose={() => { setUploadOpen(false); loadKb(); }} />}

            {kb === null ? <LoadingList rows={4} /> :
             kb.length === 0 ? (
               <EmptyState icon={<FileText className="h-6 w-6" />} title="아직 등록된 KB 기사가 없습니다"
                 description="문서를 업로드하면 AI가 답변 시 자동으로 참조합니다." />
             ) : (
              <ul className="space-y-2">
                {kb.map(a => (
                  <li key={a.id} className="glass-strong rounded-2xl border border-border/40 p-4 flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="text-sm font-bold">{a.title}</span>
                        <span className="text-[10px] rounded-full px-2 py-0.5 bg-muted/30 text-muted-foreground">#{a.category}</span>
                        {!a.active && <span className="text-[10px] rounded-full px-2 py-0.5 bg-muted/30 text-muted-foreground">비활성</span>}
                      </div>
                      {a.tags?.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-1">
                          {a.tags.map(t => <span key={t} className="text-[10px] text-muted-foreground">·{t}</span>)}
                        </div>
                      )}
                      <p className="text-[10px] text-muted-foreground">
                        {formatDistanceToNow(new Date(a.created_at), { addSuffix: true, locale: ko })}
                        {a.source_file_path && ` · ${a.source_file_path}`}
                      </p>
                    </div>
                    <button onClick={() => deleteArticle(a.id)}
                      className="px-2 py-1.5 rounded-lg bg-destructive/15 text-destructive border border-destructive/30 text-xs flex items-center gap-1">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </div>
    </>
  );
}

function KbUpload({ onClose }: { onClose: () => void }) {
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("general");
  const [tags, setTags] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (!title.trim() || !file) { notify.error("제목과 파일이 필요합니다"); return; }
    if (file.size > 5 * 1024 * 1024) { notify.error("파일이 너무 큽니다 (최대 5MB)"); return; }
    setBusy(true);
    try {
      const path = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
      const up = await supabase.storage.from("support-kb").upload(path, file, { upsert: false });
      if (up.error) throw up.error;
      const { data, error } = await supabase.functions.invoke("ingest-support-kb", {
        body: {
          path, title: title.trim(), category: category.trim() || "general",
          tags: tags.split(",").map(s => s.trim()).filter(Boolean),
        },
      });
      if (error) throw error;
      notify.success("KB 인제스트 완료", { description: (data as any)?.article?.title });
      onClose();
    } catch (e: any) {
      notify.error("업로드 실패", { description: e?.message ?? String(e) });
    } finally { setBusy(false); }
  }

  return (
    <div className="glass-strong rounded-2xl border border-primary/30 p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Sparkles className="w-4 h-4 text-primary" />
        <h3 className="text-sm font-bold">KB 문서 업로드</h3>
      </div>
      <input value={title} onChange={e => setTitle(e.target.value)} placeholder="제목 (예: 출금 SLA 정책)"
        className="w-full bg-background/40 border border-border/60 rounded-lg px-3 py-2 text-sm" />
      <div className="grid grid-cols-2 gap-2">
        <select value={category} onChange={e => setCategory(e.target.value)}
          className="bg-background/40 border border-border/60 rounded-lg px-3 py-2 text-sm">
          <option value="general">general</option>
          <option value="account">account</option>
          <option value="wallet">wallet</option>
          <option value="security">security</option>
          <option value="mission">mission</option>
          <option value="technical">technical</option>
          <option value="policy">policy</option>
        </select>
        <input value={tags} onChange={e => setTags(e.target.value)} placeholder="태그 (쉼표 구분)"
          className="bg-background/40 border border-border/60 rounded-lg px-3 py-2 text-sm" />
      </div>
      <input type="file" accept=".md,.txt,.markdown,.html,.htm,.json,.csv"
        onChange={e => setFile(e.target.files?.[0] ?? null)}
        className="w-full text-sm text-muted-foreground file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:bg-primary/15 file:text-primary file:text-xs file:font-bold" />
      <div className="flex justify-end gap-2">
        <button onClick={onClose} disabled={busy}
          className="px-3 py-1.5 rounded-lg border border-border text-sm">취소</button>
        <button onClick={submit} disabled={busy}
          className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-sm font-bold disabled:opacity-50">
          {busy ? "업로드 중..." : "업로드 & 인제스트"}
        </button>
      </div>
    </div>
  );
}
