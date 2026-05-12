import { useEffect, useState } from "react";
import { Link, useParams, Navigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { LoadingList } from "@/components/ui/loading-state";
import { EmptyState } from "@/components/ui/empty-state";

const VALID = new Set(["terms", "privacy", "risk"]);

type Doc = { doc_key: string; version: string; locale: string; title: string; body_md: string; effective_at: string };

export default function LegalDoc() {
  const { docKey = "" } = useParams();
  const [doc, setDoc] = useState<Doc | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!VALID.has(docKey)) return;
    let alive = true;
    (async () => {
      const { data } = await supabase
        .from("legal_documents")
        .select("doc_key,version,locale,title,body_md,effective_at")
        .eq("doc_key", docKey)
        .eq("locale", "ko")
        .eq("is_current", true)
        .order("effective_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (!alive) return;
      setDoc((data as Doc) ?? null);
      setLoading(false);
      if (data) {
        document.title = `${data.title} — Phonara`;
      }
    })();
    return () => { alive = false; };
  }, [docKey]);

  if (!VALID.has(docKey)) return <Navigate to="/trust" replace />;

  return (
    <div className="min-h-screen bg-background">
      <header className="container py-6 flex items-center justify-between">
        <Link to="/trust" className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1 min-h-[36px]">
          <ArrowLeft className="w-3.5 h-3.5" /> Trust Center
        </Link>
      </header>
      <main className="container max-w-3xl pb-20">
        {loading ? (
          <LoadingList rows={6} />
        ) : !doc ? (
          <EmptyState title="문서를 찾을 수 없습니다" description="요청한 법적 문서가 존재하지 않습니다." />
        ) : (
          <article className="glass-strong rounded-3xl p-6 sm:p-10">
            <h1 className="font-imperial font-black text-2xl sm:text-3xl tracking-[0.02em]">{doc.title}</h1>
            <div className="mt-1 text-[11px] text-muted-foreground tabular-nums">
              버전 {doc.version} · 시행 {new Date(doc.effective_at).toLocaleDateString("ko-KR")}
            </div>
            <pre className="mt-6 whitespace-pre-wrap text-sm leading-7 text-foreground/90 font-sans break-keep">
{doc.body_md}
            </pre>
          </article>
        )}
      </main>
    </div>
  );
}
