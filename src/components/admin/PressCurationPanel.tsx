import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { LoadingList } from "@/components/ui/loading-state";
import { EmptyState } from "@/components/ui/empty-state";
import { notify } from "@/lib/notify";
import { Newspaper, Check, X } from "lucide-react";

type Hit = {
  id: string;
  domain: string;
  hit_count: number;
  first_seen_at: string;
  last_seen_at: string;
  sample_referrer: string | null;
  reviewed: boolean;
  already_curated: boolean;
};

type Source = {
  id: string;
  domain: string;
  display_name: string;
  logo_url: string | null;
  rank: number;
  active: boolean;
};

export default function PressCurationPanel() {
  const [hits, setHits] = useState<Hit[]>([]);
  const [sources, setSources] = useState<Source[]>([]);
  const [loading, setLoading] = useState(true);
  const [onlyUnreviewed, setOnlyUnreviewed] = useState(true);

  const load = async () => {
    setLoading(true);
    const [{ data: h }, { data: s }] = await Promise.all([
      supabase.rpc("admin_list_inbound_hits" as any, { _limit: 200, _only_unreviewed: onlyUnreviewed }),
      supabase.from("press_sources" as any).select("*").order("rank", { ascending: true }),
    ]);
    setHits((h ?? []) as Hit[]);
    setSources((s ?? []) as Source[]);
    setLoading(false);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [onlyUnreviewed]);

  const approve = async (hit: Hit) => {
    const display = window.prompt(`표시명 (예: TechCrunch)`, hit.domain.split(".")[0]);
    if (!display) return;
    const logo = window.prompt(`로고 URL (선택, 비워도 됨)`, "") || null;
    const rank = Number(window.prompt(`표시 순위 (낮을수록 먼저)`, "100") || "100");
    const { error } = await supabase.rpc("admin_approve_press_source" as any, {
      _domain: hit.domain, _display_name: display, _logo_url: logo, _rank: rank,
    });
    if (error) return notify.error(error.message);
    notify.success(`${display} 추가 완료`);
    load();
  };

  const dismiss = async (id: string) => {
    const { error } = await supabase.rpc("admin_dismiss_inbound_hit" as any, { _id: id });
    if (error) return notify.error(error.message);
    load();
  };

  const toggle = async (s: Source) => {
    const { error } = await supabase.rpc("admin_toggle_press_source" as any, { _id: s.id, _active: !s.active });
    if (error) return notify.error(error.message);
    load();
  };

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Newspaper className="h-5 w-5" /> Inbound 후보
          </h3>
          <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer">
            <input type="checkbox" checked={onlyUnreviewed} onChange={(e) => setOnlyUnreviewed(e.target.checked)} />
            미검토만
          </label>
        </div>
        {loading ? (
          <LoadingList rows={4} />
        ) : hits.length === 0 ? (
          <EmptyState icon={Newspaper} title="아직 들어온 referrer 없음" description="외부 사이트에서 phonara로 유입이 발생하면 여기 자동으로 쌓입니다." />
        ) : (
          <div className="space-y-2">
            {hits.map((h) => (
              <Card key={h.id} className="p-3 flex items-center justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="font-mono text-sm font-semibold truncate">
                    {h.domain}
                    {h.already_curated && <span className="ml-2 text-xs text-emerald-500">✓ curated</span>}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {h.hit_count} hits · last {new Date(h.last_seen_at).toLocaleString()}
                  </div>
                  {h.sample_referrer && (
                    <div className="text-[10px] text-muted-foreground truncate">{h.sample_referrer}</div>
                  )}
                </div>
                <div className="flex gap-2 shrink-0">
                  {!h.already_curated && (
                    <Button size="sm" onClick={() => approve(h)}>
                      <Check className="h-4 w-4 mr-1" /> 승인
                    </Button>
                  )}
                  <Button size="sm" variant="outline" onClick={() => dismiss(h.id)}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      <div>
        <h3 className="text-lg font-semibold mb-3">큐레이션된 Press Sources</h3>
        {sources.length === 0 ? (
          <EmptyState icon={Newspaper} title="등록된 소스 없음" description="후보를 승인하면 여기로 옮겨집니다." />
        ) : (
          <div className="space-y-2">
            {sources.map((s) => (
              <Card key={s.id} className="p-3 flex items-center justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="font-semibold">{s.display_name}</div>
                  <div className="text-xs text-muted-foreground font-mono">{s.domain} · rank {s.rank}</div>
                </div>
                <Button size="sm" variant={s.active ? "default" : "outline"} onClick={() => toggle(s)}>
                  {s.active ? "활성" : "비활성"}
                </Button>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
