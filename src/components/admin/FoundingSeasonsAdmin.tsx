import { useEffect, useState } from "react";
import { Crown, Plus, Pencil, Square, Unlock, RefreshCw } from "lucide-react";
import { LuxButton, LuxInput } from "@/components/ui/lux";
import { LoadingList } from "@/components/ui/loading-state";
import { EmptyState } from "@/components/ui/empty-state";
import { notify } from "@/lib/notify";
import {
  adminListFoundingSeasons, adminCreateFoundingSeason,
  adminUpdateFoundingSeason, adminEndFoundingSeason,
  adminReleaseFoundingSeat, type FoundingSeasonAdminRow,
} from "@/lib/foundingSeason";
import { useRealtimeChannel } from "@/hooks/use-realtime-channel";

export default function FoundingSeasonsAdmin() {
  const [rows, setRows] = useState<FoundingSeasonAdminRow[] | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState<FoundingSeasonAdminRow | null>(null);
  const [releasing, setReleasing] = useState<FoundingSeasonAdminRow | null>(null);

  async function load() {
    try { setRows(await adminListFoundingSeasons()); }
    catch (e: any) { notify.error("로드 실패", { description: e.message }); }
  }
  useEffect(() => { void load(); }, []);

  useRealtimeChannel({
    key: "admin:fs",
    bindings: [
      { event: "*", table: "founding_seasons" },
      { event: "*", table: "founding_season_seats" },
    ],
    onEvent: () => void load(),
  });

  async function endSeason(s: FoundingSeasonAdminRow) {
    if (!confirm(`"${s.title}" 시즌을 종료하고 자동 정산할까요?`)) return;
    try {
      const r: any = await adminEndFoundingSeason(s.id);
      notify.success("시즌 종료 + 정산 완료", { description: `${r?.settled_users ?? 0}명에게 퍼크 지급` });
      load();
    } catch (e: any) { notify.error("종료 실패", { description: e.message }); }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-imperial font-bold text-sm flex items-center gap-2">
          <Crown className="w-4 h-4 text-gold" /> Founding Emperor 시즌 관리
        </h3>
        <div className="flex gap-2">
          <LuxButton variant="ghost" size="sm" onClick={load}><RefreshCw className="w-3.5 h-3.5" /></LuxButton>
          <LuxButton variant="primary" size="sm" onClick={() => setShowCreate(true)}>
            <Plus className="w-3.5 h-3.5 mr-1" /> 새 시즌
          </LuxButton>
        </div>
      </div>

      {rows === null && <LoadingList rows={3} />}
      {rows && rows.length === 0 && <EmptyState title="시즌 없음" description="첫 Founding Emperor 시즌을 만들어보세요." />}
      {rows?.map((s) => (
        <div key={s.id} className="glass-strong rounded-2xl p-4 space-y-2 neon-border">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-imperial font-black text-base text-gradient-imperial">{s.title}</span>
                <span className="text-[10px] text-muted-foreground tabular-nums">{s.code}</span>
                {s.active && <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300">진행중</span>}
                {!s.active && !s.settled_at && <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300">정산대기</span>}
                {s.settled_at && <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground">정산완료</span>}
              </div>
              {s.subtitle && <div className="text-xs text-muted-foreground mt-0.5 break-keep">{s.subtitle}</div>}
              <div className="text-[11px] text-muted-foreground tabular-nums mt-1">
                좌석 {s.claimed} / {s.total_seats}
                {s.ends_at && <> · 종료 {new Date(s.ends_at).toLocaleString()}</>}
              </div>
              {Array.isArray(s.perks) && s.perks.length > 0 && (
                <ul className="mt-2 space-y-0.5">
                  {s.perks.map((p: any, i: number) => (
                    <li key={i} className="text-[11px] text-gold/90">· {String(p)}</li>
                  ))}
                </ul>
              )}
            </div>
          </div>
          <div className="flex flex-wrap gap-2 pt-1">
            <LuxButton variant="ghost" size="sm" onClick={() => setEditing(s)}>
              <Pencil className="w-3 h-3 mr-1" /> 수정
            </LuxButton>
            <LuxButton variant="ghost" size="sm" onClick={() => setReleasing(s)}>
              <Unlock className="w-3 h-3 mr-1" /> 좌석 해제
            </LuxButton>
            {s.active && (
              <LuxButton variant="primary" size="sm" onClick={() => endSeason(s)}>
                <Square className="w-3 h-3 mr-1" /> 시즌 종료 + 정산
              </LuxButton>
            )}
            {!s.active && !s.settled_at && (
              <LuxButton variant="primary" size="sm" onClick={() => endSeason(s)}>
                즉시 정산
              </LuxButton>
            )}
          </div>
        </div>
      ))}

      {showCreate && <CreateModal onClose={() => setShowCreate(false)} onSaved={() => { setShowCreate(false); load(); }} />}
      {editing && <EditModal row={editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); load(); }} />}
      {releasing && <ReleaseModal row={releasing} onClose={() => setReleasing(null)} onSaved={() => { setReleasing(null); load(); }} />}
    </div>
  );
}

function CreateModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [code, setCode] = useState("");
  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [total, setTotal] = useState(100);
  const [perksText, setPerksText] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [busy, setBusy] = useState(false);
  async function save() {
    if (!code || !title) { notify.error("필수 입력", { description: "코드/제목" }); return; }
    setBusy(true);
    try {
      await adminCreateFoundingSeason({
        code, title, subtitle,
        total: Number(total),
        perks: perksText.split("\n").map(s => s.trim()).filter(Boolean),
        ends_at: endsAt ? new Date(endsAt).toISOString() : null,
      });
      notify.success("시즌 생성 완료");
      onSaved();
    } catch (e: any) { notify.error("생성 실패", { description: e.message }); }
    finally { setBusy(false); }
  }
  return (
    <Backdrop onClose={onClose} title="새 Founding 시즌">
      <LuxInput placeholder="코드 (예: S2_RISING_KING)" value={code} onChange={e => setCode(e.target.value)} />
      <LuxInput placeholder="제목" value={title} onChange={e => setTitle(e.target.value)} />
      <LuxInput placeholder="부제 (선택)" value={subtitle} onChange={e => setSubtitle(e.target.value)} />
      <LuxInput type="number" placeholder="총 좌석 수" value={total} onChange={e => setTotal(Number(e.target.value))} />
      <textarea className="w-full bg-input/70 border border-border/70 rounded-2xl px-4 py-3 text-sm min-h-[100px]"
        placeholder="퍼크 (한 줄에 하나)" value={perksText} onChange={e => setPerksText(e.target.value)} />
      <label className="text-[11px] text-muted-foreground">종료 일시 (선택)</label>
      <LuxInput type="datetime-local" value={endsAt} onChange={e => setEndsAt(e.target.value)} />
      <LuxButton variant="primary" block onClick={save} disabled={busy}>{busy ? "생성 중..." : "생성 (이전 활성 시즌은 비활성화)"}</LuxButton>
    </Backdrop>
  );
}

function EditModal({ row, onClose, onSaved }: { row: FoundingSeasonAdminRow; onClose: () => void; onSaved: () => void }) {
  const [title, setTitle] = useState(row.title);
  const [subtitle, setSubtitle] = useState(row.subtitle ?? "");
  const [perksText, setPerksText] = useState(Array.isArray(row.perks) ? row.perks.join("\n") : "");
  const [endsAt, setEndsAt] = useState(row.ends_at ? new Date(row.ends_at).toISOString().slice(0, 16) : "");
  const [busy, setBusy] = useState(false);
  async function save() {
    setBusy(true);
    try {
      await adminUpdateFoundingSeason({
        id: row.id, title, subtitle,
        perks: perksText.split("\n").map(s => s.trim()).filter(Boolean),
        ends_at: endsAt ? new Date(endsAt).toISOString() : null,
      });
      notify.success("수정 완료"); onSaved();
    } catch (e: any) { notify.error("수정 실패", { description: e.message }); }
    finally { setBusy(false); }
  }
  return (
    <Backdrop onClose={onClose} title={`시즌 수정 — ${row.code}`}>
      <LuxInput value={title} onChange={e => setTitle(e.target.value)} />
      <LuxInput value={subtitle} onChange={e => setSubtitle(e.target.value)} placeholder="부제" />
      <textarea className="w-full bg-input/70 border border-border/70 rounded-2xl px-4 py-3 text-sm min-h-[100px]"
        value={perksText} onChange={e => setPerksText(e.target.value)} />
      <LuxInput type="datetime-local" value={endsAt} onChange={e => setEndsAt(e.target.value)} />
      <LuxButton variant="primary" block onClick={save} disabled={busy}>{busy ? "저장 중..." : "저장"}</LuxButton>
    </Backdrop>
  );
}

function ReleaseModal({ row, onClose, onSaved }: { row: FoundingSeasonAdminRow; onClose: () => void; onSaved: () => void }) {
  const [seatNo, setSeatNo] = useState<number>(1);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  async function save() {
    if (!reason || reason.length < 3) { notify.error("사유 입력 필요", { description: "최소 3자" }); return; }
    setBusy(true);
    try {
      await adminReleaseFoundingSeat(row.id, seatNo, reason);
      notify.success("좌석 해제 완료"); onSaved();
    } catch (e: any) { notify.error("해제 실패", { description: e.message }); }
    finally { setBusy(false); }
  }
  return (
    <Backdrop onClose={onClose} title={`좌석 해제 — ${row.code}`}>
      <label className="text-[11px] text-muted-foreground">좌석 번호 (1 ~ {row.total_seats})</label>
      <LuxInput type="number" value={seatNo} onChange={e => setSeatNo(Number(e.target.value))} />
      <textarea className="w-full bg-input/70 border border-border/70 rounded-2xl px-4 py-3 text-sm min-h-[80px]"
        placeholder="해제 사유 (필수, 사용자에게 알림 발송)" value={reason} onChange={e => setReason(e.target.value)} />
      <LuxButton variant="primary" block onClick={save} disabled={busy}>{busy ? "처리 중..." : "강제 해제"}</LuxButton>
    </Backdrop>
  );
}

function Backdrop({ children, onClose, title }: { children: React.ReactNode; onClose: () => void; title: string }) {
  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div className="glass-strong rounded-3xl p-5 w-full max-w-md space-y-3 neon-border max-h-[90vh] overflow-auto"
        onClick={e => e.stopPropagation()}>
        <h4 className="font-imperial font-bold text-sm">{title}</h4>
        {children}
        <button onClick={onClose} className="text-xs text-muted-foreground w-full pt-2">닫기</button>
      </div>
    </div>
  );
}
