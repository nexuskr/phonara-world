/**
 * /dynasty — 자녀 양도(Dynasty Bequest) 관리 페이지
 * - 부모: 자녀 초대 / PHON·NFT 양도 요청 / 진행중 양도 취소
 * - 자녀: 받은 초대 토큰 수락 / 받은 양도 내역
 *
 * 보안: 양도 요청·실행은 TOTP 2단계 인증 필수 (서버 검증).
 */
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/empty-state";
import { LoadingList } from "@/components/ui/loading-state";
import { notify } from "@/lib/notify";
import { Crown, UserPlus, Send, Clock, X, Check, Copy } from "lucide-react";
import {
  requestDynasty, acceptDynasty, cancelDynasty, getMyDynastyLinks,
  requestBequest, executeBequest, cancelBequest, getMyBequests,
  type DynastyLink, type Bequest,
} from "@/lib/dynasty";
import { useMyPower } from "@/hooks/use-my-power";

export default function Dynasty() {
  const [links, setLinks] = useState<DynastyLink[]>([]);
  const [bequests, setBequests] = useState<Bequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [childEmail, setChildEmail] = useState("");
  const [acceptToken, setAcceptToken] = useState("");
  const [phonAmounts, setPhonAmounts] = useState<Record<string, string>>({});
  const { phon, nfts } = useMyPower();

  async function refresh() {
    try {
      const [l, b] = await Promise.all([getMyDynastyLinks(), getMyBequests()]);
      setLinks(l); setBequests(b);
    } catch (e: any) {
      notify.error(e.message ?? "불러오기 실패");
    } finally { setLoading(false); }
  }

  useEffect(() => { refresh(); }, []);

  async function onInvite() {
    if (!childEmail.trim()) return;
    try {
      const r = await requestDynasty(childEmail.trim());
      navigator.clipboard?.writeText(r.invite_token).catch(() => {});
      notify.success("초대 토큰이 클립보드에 복사되었습니다. 자녀에게 전달하세요.");
      setChildEmail("");
      refresh();
    } catch (e: any) { notify.error(e.message ?? "초대 실패"); }
  }

  async function onAccept() {
    if (!acceptToken.trim()) return;
    try {
      await acceptDynasty(acceptToken.trim());
      notify.success("자녀로 등록되었습니다.");
      setAcceptToken("");
      refresh();
    } catch (e: any) { notify.error(e.message ?? "수락 실패"); }
  }

  async function onCancelLink(id: string) {
    if (!confirm("정말 연결을 해제하시겠습니까?")) return;
    try { await cancelDynasty(id); notify.success("해제되었습니다."); refresh(); }
    catch (e: any) { notify.error(e.message ?? "해제 실패"); }
  }

  async function onRequestPhon(linkId: string) {
    const amt = parseFloat(phonAmounts[linkId] ?? "0");
    if (!amt || amt <= 0) { notify.error("PHON 금액을 입력하세요"); return; }
    if (amt > phon) { notify.error("잔고 부족"); return; }
    if (!confirm(`${amt.toLocaleString()} PHON을 양도 요청하시겠습니까? (48시간 쿨다운 후 실행)`)) return;
    try {
      await requestBequest({ linkId, assetKind: "phon", phonAmount: amt });
      notify.success("양도 요청 완료. 48시간 후 실행 가능.");
      setPhonAmounts((s) => ({ ...s, [linkId]: "" }));
      refresh();
    } catch (e: any) {
      notify.error(e.message?.includes("aal2") ? "TOTP 2단계 인증이 필요합니다." : (e.message ?? "요청 실패"));
    }
  }

  async function onRequestNft(linkId: string, nftId: string) {
    if (!confirm("이 NFT를 양도 요청하시겠습니까? (48시간 쿨다운)")) return;
    try {
      await requestBequest({ linkId, assetKind: "nft", nftId });
      notify.success("NFT 양도 요청 완료.");
      refresh();
    } catch (e: any) {
      notify.error(e.message?.includes("aal2") ? "TOTP 2단계 인증이 필요합니다." : (e.message ?? "요청 실패"));
    }
  }

  async function onExecute(reqId: string) {
    try { await executeBequest(reqId); notify.success("양도 완료!"); refresh(); }
    catch (e: any) {
      notify.error(e.message?.includes("cooldown") ? "아직 쿨다운 중입니다."
        : e.message?.includes("aal2") ? "TOTP 2단계 인증이 필요합니다." : (e.message ?? "실행 실패"));
    }
  }

  async function onCancelReq(reqId: string) {
    if (!confirm("양도 요청을 취소하시겠습니까? PHON은 환원됩니다.")) return;
    try { await cancelBequest(reqId); notify.success("취소되었습니다."); refresh(); }
    catch (e: any) { notify.error(e.message ?? "취소 실패"); }
  }

  if (loading) return <div className="container mx-auto max-w-3xl py-6 px-4"><LoadingList rows={4} /></div>;

  const parentLinks = links.filter((l) => l.role === "parent");
  const childLinks = links.filter((l) => l.role === "child");

  return (
    <div className="container mx-auto max-w-3xl py-6 px-4 space-y-6">
      <header className="space-y-1.5 text-center">
        <h1 className="font-imperial text-3xl text-gradient-imperial tracking-wider flex items-center justify-center gap-2">
          <Crown className="w-7 h-7 text-amber-300" /> 왕조 양도
        </h1>
        <p className="text-xs text-muted-foreground">
          PHON·NFT를 자녀에게 양도합니다 — KYC 완료 성인만 · 48시간 쿨다운 · TOTP 2단계 필수
        </p>
      </header>

      {/* 자녀 초대 */}
      <Card className="p-4 space-y-3 border-primary/30">
        <div className="flex items-center gap-2 font-display font-bold">
          <UserPlus className="w-4 h-4 text-primary" /> 자녀 초대 (최대 3명)
        </div>
        <div className="flex gap-2">
          <Input type="email" placeholder="자녀 이메일" value={childEmail}
            onChange={(e) => setChildEmail(e.target.value)} />
          <Button onClick={onInvite} disabled={!childEmail.trim()}>초대</Button>
        </div>
        <p className="text-[11px] text-muted-foreground">
          초대 후 발급되는 토큰을 자녀에게 전달하면, 자녀가 이 페이지에서 수락합니다.
        </p>
      </Card>

      {/* 토큰 수락 */}
      <Card className="p-4 space-y-3 border-emerald-500/30">
        <div className="flex items-center gap-2 font-display font-bold">
          <Check className="w-4 h-4 text-emerald-400" /> 부모 초대 토큰 수락
        </div>
        <div className="flex gap-2">
          <Input placeholder="초대 토큰 붙여넣기" value={acceptToken}
            onChange={(e) => setAcceptToken(e.target.value)} />
          <Button variant="secondary" onClick={onAccept} disabled={!acceptToken.trim()}>수락</Button>
        </div>
        <p className="text-[11px] text-muted-foreground">
          KYC 레벨 2+ (실명+셀카) 통과 + 만 19세 이상이어야 수락 가능합니다.
        </p>
      </Card>

      {/* 활성 자녀 */}
      <section className="space-y-2">
        <h2 className="font-display font-bold text-sm">내 자녀 ({parentLinks.filter((l) => l.status === "active").length})</h2>
        {parentLinks.length === 0 ? (
          <EmptyState icon={UserPlus} title="아직 자녀가 없습니다" description="위에서 자녀 이메일로 초대하세요." />
        ) : parentLinks.map((l) => (
          <Card key={l.id} className="p-3 space-y-2">
            <div className="flex items-center justify-between">
              <div className="text-sm">
                <div className="font-medium">{l.child_email}</div>
                <div className="text-[11px] text-muted-foreground">
                  {l.status === "active" ? `활성 · ${new Date(l.accepted_at!).toLocaleDateString()}` : "대기중"}
                </div>
              </div>
              <Button size="sm" variant="ghost" onClick={() => onCancelLink(l.id)}>
                <X className="w-4 h-4" />
              </Button>
            </div>
            {l.status === "active" && (
              <div className="space-y-2 pt-2 border-t border-border/40">
                <div className="flex gap-2 items-center">
                  <Input type="number" placeholder="PHON 금액" className="text-sm"
                    value={phonAmounts[l.id] ?? ""}
                    onChange={(e) => setPhonAmounts((s) => ({ ...s, [l.id]: e.target.value }))} />
                  <Button size="sm" onClick={() => onRequestPhon(l.id)}>
                    <Send className="w-3.5 h-3.5 mr-1" /> PHON 양도
                  </Button>
                </div>
                {nfts.length > 0 && (
                  <details className="text-xs">
                    <summary className="cursor-pointer text-muted-foreground hover:text-foreground">NFT 양도 ({nfts.length}개)</summary>
                    <div className="mt-2 grid grid-cols-2 gap-1.5">
                      {nfts.map((n) => (
                        <Button key={n.id} size="sm" variant="outline" onClick={() => onRequestNft(l.id, n.id)}>
                          {n.type} · {n.level} (+{n.boost_pct}%)
                        </Button>
                      ))}
                    </div>
                  </details>
                )}
              </div>
            )}
          </Card>
        ))}
      </section>

      {/* 부모 */}
      {childLinks.length > 0 && (
        <section className="space-y-2">
          <h2 className="font-display font-bold text-sm">내 부모</h2>
          {childLinks.map((l) => (
            <Card key={l.id} className="p-3 text-sm">
              부모 계정과 활성 연결됨 · {new Date(l.accepted_at!).toLocaleDateString()}
            </Card>
          ))}
        </section>
      )}

      {/* 진행중 양도 */}
      <section className="space-y-2">
        <h2 className="font-display font-bold text-sm">양도 내역 ({bequests.length})</h2>
        {bequests.length === 0 ? (
          <EmptyState icon={Clock} title="양도 내역 없음" />
        ) : bequests.map((b) => {
          const cooldownLeft = new Date(b.cooldown_until).getTime() - Date.now();
          const ready = cooldownLeft <= 0;
          return (
            <Card key={b.id} className="p-3 flex items-center justify-between">
              <div className="text-sm">
                <div className="font-medium">
                  {b.role === "parent" ? "→ 발신" : "← 수신"} ·{" "}
                  {b.asset_kind === "phon" ? `${(b.phon_amount ?? 0).toLocaleString()} PHON` : "NFT"}
                </div>
                <div className="text-[11px] text-muted-foreground">
                  {b.status === "executed" && `완료 · ${new Date(b.executed_at!).toLocaleString()}`}
                  {b.status === "cancelled" && "취소됨"}
                  {(b.status === "cooldown" || b.status === "executable") && (
                    ready ? "✅ 실행 가능" : `⏳ ${Math.ceil(cooldownLeft / 3600_000)}h 남음`
                  )}
                </div>
              </div>
              {b.role === "parent" && (b.status === "cooldown" || b.status === "executable") && (
                <div className="flex gap-1.5">
                  {ready && <Button size="sm" onClick={() => onExecute(b.id)}>실행</Button>}
                  <Button size="sm" variant="ghost" onClick={() => onCancelReq(b.id)}>취소</Button>
                </div>
              )}
            </Card>
          );
        })}
      </section>
    </div>
  );
}
