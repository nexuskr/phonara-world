import { useEffect, useState } from "react";
import Layout from "@/components/Layout";
import SEOHead from "@/components/seo/SEOHead";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { LoadingList } from "@/components/ui/loading-state";
import { EmptyState } from "@/components/ui/empty-state";
import { notify } from "@/lib/notify";
import { useRequireAuth } from "@/hooks/use-require-auth";
import {
  listMyApiKeys, createApiKey, revokeApiKey, simApiBaseUrl,
  type ApiKeyRow, type CreatedApiKey,
} from "@/lib/devApi";
import { Code2, Copy, KeyRound, Trash2, Terminal, Zap } from "lucide-react";

export default function DevConsole() {
  useRequireAuth();
  const [keys, setKeys] = useState<ApiKeyRow[] | null>(null);
  const [name, setName] = useState("");
  const [limit, setLimit] = useState(60);
  const [creating, setCreating] = useState(false);
  const [justCreated, setJustCreated] = useState<CreatedApiKey | null>(null);

  const load = async () => {
    try { setKeys(await listMyApiKeys()); } catch (e: any) { notify.error(e.message); }
  };
  useEffect(() => { load(); }, []);

  const create = async () => {
    if (!name.trim()) return notify.error("이름을 입력하세요");
    setCreating(true);
    try {
      const k = await createApiKey(name.trim(), limit);
      setJustCreated(k);
      setName("");
      notify.success("API 키 생성 완료 — 시크릿은 지금만 볼 수 있습니다");
      load();
    } catch (e: any) {
      const msg = e.message?.includes("max_keys") ? "활성 키는 최대 10개까지" : e.message;
      notify.error(msg);
    } finally { setCreating(false); }
  };

  const revoke = async (k: ApiKeyRow) => {
    if (!confirm(`${k.name} 키를 비활성화할까요? 되돌릴 수 없습니다.`)) return;
    try { await revokeApiKey(k.id); notify.success("키 비활성화"); load(); }
    catch (e: any) { notify.error(e.message); }
  };

  const copy = (txt: string) => {
    navigator.clipboard.writeText(txt);
    notify.success("복사됨");
  };

  const baseUrl = simApiBaseUrl();
  const curlExample = `curl -H "Authorization: Bearer YOUR_KEY" \\
  "${baseUrl}/quote/BTC"`;

  return (
    <Layout>
      <SEOHead
        title="Phonara Developer Console — Trading Sim API"
        description="Free trading simulation API for developers. Realistic crypto quotes for backtesting, demos, B2B integrations."
        path="/dev/console"
      />
      <div className="container py-8 space-y-8 animate-liquid-in">
        <header className="space-y-2">
          <div className="flex items-center gap-2 text-primary text-xs font-bold tracking-[0.3em] uppercase">
            <Terminal className="h-4 w-4" /> Phonara Developer
          </div>
          <h1 className="font-imperial text-3xl sm:text-4xl tracking-tight text-gradient-imperial">
            Trading Sim API
          </h1>
          <p className="text-sm text-muted-foreground max-w-2xl">
            실시간 가격 시뮬레이션 엔드포인트. 백테스트·데모·교육 콘텐츠에 무료로 사용하세요.
            모든 호출은 키별 분당 한도로 보호됩니다.
          </p>
        </header>

        {/* Quickstart */}
        <Card className="p-5 space-y-3">
          <h2 className="font-bold flex items-center gap-2"><Zap className="h-4 w-4 text-primary" /> Quickstart</h2>
          <pre className="text-xs bg-muted/40 p-3 rounded-lg overflow-x-auto font-mono">{curlExample}</pre>
          <div className="grid sm:grid-cols-3 gap-2 text-xs">
            <Card className="p-3"><div className="font-mono text-primary">GET /quote/:symbol</div><div className="text-muted-foreground mt-1">단일 심볼 시세</div></Card>
            <Card className="p-3"><div className="font-mono text-primary">GET /quote?symbol=BTC</div><div className="text-muted-foreground mt-1">쿼리 방식</div></Card>
            <Card className="p-3"><div className="font-mono text-primary">GET /symbols</div><div className="text-muted-foreground mt-1">지원 심볼 목록</div></Card>
          </div>
          <div className="text-xs text-muted-foreground">
            기본 한도: 분당 60회 · 응답 헤더 <code className="font-mono">X-RateLimit-Remaining</code> 확인.
          </div>
        </Card>

        {/* Create key */}
        <Card className="p-5 space-y-3">
          <h2 className="font-bold flex items-center gap-2"><KeyRound className="h-4 w-4 text-primary" /> 새 API 키 발급</h2>
          <div className="grid sm:grid-cols-[1fr_120px_auto] gap-2">
            <Input placeholder="키 이름 (예: backtest-bot)" value={name} onChange={(e) => setName(e.target.value)} maxLength={64} />
            <Input type="number" min={1} max={600} value={limit} onChange={(e) => setLimit(Number(e.target.value) || 60)} />
            <Button onClick={create} disabled={creating}>{creating ? "생성 중..." : "발급"}</Button>
          </div>
          <div className="text-xs text-muted-foreground">분당 한도(1~600). 활성 키 최대 10개.</div>

          {justCreated && (
            <div className="mt-3 p-4 rounded-lg border-2 border-primary/50 bg-primary/5 space-y-2">
              <div className="text-xs font-bold text-primary">⚠️ 시크릿은 지금만 표시됩니다 — 안전한 곳에 저장하세요</div>
              <div className="flex items-center gap-2">
                <code className="flex-1 font-mono text-xs bg-background/60 p-2 rounded break-all">{justCreated.secret}</code>
                <Button size="sm" variant="outline" onClick={() => copy(justCreated.secret)}>
                  <Copy className="h-3 w-3" />
                </Button>
              </div>
              <Button size="sm" variant="ghost" onClick={() => setJustCreated(null)}>닫기</Button>
            </div>
          )}
        </Card>

        {/* Keys list */}
        <Card className="p-5 space-y-3">
          <h2 className="font-bold">내 API 키</h2>
          {keys === null ? (
            <LoadingList rows={3} />
          ) : keys.length === 0 ? (
            <EmptyState icon={<Code2 className="h-5 w-5" />} title="발급된 키 없음" description="위에서 첫 키를 발급해 보세요." />
          ) : (
            <div className="space-y-2">
              {keys.map((k) => (
                <div key={k.id} className="flex items-center justify-between gap-3 p-3 rounded-lg border border-border/60">
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold text-sm truncate">
                      {k.name}
                      {!k.active && <span className="ml-2 text-xs text-destructive">REVOKED</span>}
                    </div>
                    <div className="text-xs text-muted-foreground font-mono">
                      {k.prefix}_••••• · {k.rate_limit_per_min}/min
                    </div>
                    <div className="text-[10px] text-muted-foreground">
                      생성 {new Date(k.created_at).toLocaleDateString()}
                      {k.last_used_at && ` · 마지막 사용 ${new Date(k.last_used_at).toLocaleString()}`}
                    </div>
                  </div>
                  {k.active && (
                    <Button size="sm" variant="ghost" onClick={() => revoke(k)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </Layout>
  );
}
