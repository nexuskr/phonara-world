import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Link2, Plus, Copy, Trash2, Power, Loader2, ExternalLink } from "lucide-react";

type Channel = "tiktok" | "instagram" | "threads" | "naver" | "youtube" | "kakao" | "etc";

interface Campaign {
  id: string;
  user_id: string;
  slug: string;
  channel: Channel;
  label: string;
  target_url: string;
  code: string | null;
  active: boolean;
  clicks_cached: number;
  conversions_cached: number;
  created_at: string;
}

const CHANNELS: Channel[] = ["tiktok", "instagram", "threads", "naver", "youtube", "kakao", "etc"];

const PUBLIC_BASE =
  typeof window !== "undefined"
    ? window.location.origin
    : "https://phonara.world";

function genSlug(channel: string) {
  const random = Math.random().toString(36).slice(2, 8);
  return `${channel}-${random}`;
}

function genCode() {
  // Human-readable 6 char code.
  const a = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let s = "";
  for (let i = 0; i < 6; i++) s += a[Math.floor(Math.random() * a.length)];
  return s;
}

export default function CampaignManager() {
  const [rows, setRows] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [fChannel, setFChannel] = useState<Channel>("instagram");
  const [fLabel, setFLabel] = useState("");
  const [fTarget, setFTarget] = useState("https://phonara.world?ref=");

  const load = async () => {
    setLoading(true);
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) { setLoading(false); return; }
    const { data, error } = await supabase
      .from("ugc_campaigns")
      .select("*")
      .eq("user_id", u.user.id)
      .order("created_at", { ascending: false });
    if (!error) setRows((data || []) as Campaign[]);
    setLoading(false);
  };

  useEffect(() => { void load(); }, []);

  const create = async () => {
    if (!fLabel.trim()) {
      toast({ title: "라벨을 입력해주세요", variant: "destructive" });
      return;
    }
    if (!/^https?:\/\//.test(fTarget)) {
      toast({ title: "유효한 URL이 아닙니다", variant: "destructive" });
      return;
    }
    setSaving(true);
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) { setSaving(false); return; }
    const { error } = await supabase.from("ugc_campaigns").insert({
      user_id: u.user.id,
      slug: genSlug(fChannel),
      channel: fChannel,
      label: fLabel.trim().slice(0, 80),
      target_url: fTarget.trim(),
      code: genCode(),
      active: true,
    } as any);
    setSaving(false);
    if (error) {
      toast({ title: "생성 실패", description: error.message, variant: "destructive" });
      return;
    }
    setFLabel("");
    toast({ title: "✓ 캠페인 생성됨" });
    void load();
  };

  const toggleActive = async (c: Campaign) => {
    const { error } = await supabase
      .from("ugc_campaigns")
      .update({ active: !c.active, updated_at: new Date().toISOString() })
      .eq("id", c.id);
    if (error) toast({ title: "변경 실패", variant: "destructive" });
    else { setRows(rs => rs.map(r => r.id === c.id ? { ...r, active: !c.active } : r)); }
  };

  const remove = async (c: Campaign) => {
    if (!confirm(`"${c.label}" 캠페인을 삭제할까요?`)) return;
    const { error } = await supabase.from("ugc_campaigns").delete().eq("id", c.id);
    if (error) toast({ title: "삭제 실패", variant: "destructive" });
    else {
      setRows(rs => rs.filter(r => r.id !== c.id));
      toast({ title: "삭제됨" });
    }
  };

  const shareUrl = (c: Campaign) => `${PUBLIC_BASE}/c/${c.slug}`;

  const copy = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({ title: `✓ ${label} 복사됨` });
    } catch {
      toast({ title: "복사 실패", variant: "destructive" });
    }
  };

  return (
    <section className="glass rounded-2xl p-4 border border-border">
      <h2 className="font-bold text-sm mb-3 flex items-center gap-1.5">
        <Link2 className="w-4 h-4 text-primary" /> 캠페인 링크 관리
      </h2>

      {/* Create form */}
      <div className="grid grid-cols-3 gap-2 mb-2">
        <select
          value={fChannel}
          onChange={(e) => setFChannel(e.target.value as Channel)}
          className="rounded-lg bg-background border border-border px-2 py-2 text-xs"
        >
          {CHANNELS.map(c => <option key={c} value={c}>{c.toUpperCase()}</option>)}
        </select>
        <input
          value={fLabel}
          onChange={(e) => setFLabel(e.target.value)}
          placeholder="캠페인 이름 (예: TikTok 부업 시리즈)"
          className="col-span-2 rounded-lg bg-background border border-border px-2 py-2 text-xs"
          maxLength={80}
        />
      </div>
      <div className="flex gap-2 mb-3">
        <input
          value={fTarget}
          onChange={(e) => setFTarget(e.target.value)}
          placeholder="https://phonara.world?ref=..."
          className="flex-1 rounded-lg bg-background border border-border px-2 py-2 text-xs"
        />
        <button
          onClick={create}
          disabled={saving}
          className="min-h-[36px] px-3 rounded-lg bg-gradient-primary text-primary-foreground text-xs font-bold flex items-center gap-1 disabled:opacity-50"
        >
          {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
          생성
        </button>
      </div>

      {/* List */}
      {loading ? (
        <div className="text-xs text-muted-foreground text-center py-4">로딩…</div>
      ) : rows.length === 0 ? (
        <div className="text-xs text-muted-foreground text-center py-6 break-keep">
          채널별 캠페인 링크를 만들어 클릭/전환을 추적하세요.
        </div>
      ) : (
        <div className="space-y-1.5">
          {rows.map(c => {
            const url = shareUrl(c);
            return (
              <div key={c.id} className={`rounded-xl border p-2.5 text-xs ${c.active ? "border-primary/30 bg-card" : "border-border/40 bg-muted/20 opacity-60"}`}>
                <div className="flex items-center justify-between gap-2 mb-1">
                  <div className="font-bold flex items-center gap-2 min-w-0">
                    <span className="text-primary uppercase text-[10px]">{c.channel}</span>
                    <span className="truncate">{c.label}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => toggleActive(c)} title={c.active ? "비활성화" : "활성화"}
                      className={`p-1.5 rounded-md ${c.active ? "text-emerald-500" : "text-muted-foreground"} hover:bg-muted/40`}>
                      <Power className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => remove(c)} className="p-1.5 rounded-md text-destructive hover:bg-destructive/10">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                <div className="flex items-center gap-1 font-mono text-[10px] text-muted-foreground bg-muted/30 rounded-md px-2 py-1">
                  <span className="truncate flex-1">{url}</span>
                  <button onClick={() => copy(url, "링크")} className="p-1 hover:text-primary"><Copy className="w-3 h-3" /></button>
                  <a href={c.target_url} target="_blank" rel="noopener noreferrer" className="p-1 hover:text-primary">
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
                <div className="flex items-center justify-between mt-1.5 text-[10px] text-muted-foreground tabular-nums">
                  <span>코드 <b className="text-foreground font-mono">{c.code}</b></span>
                  <span>👀 {c.clicks_cached} · 💳 {c.conversions_cached}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
