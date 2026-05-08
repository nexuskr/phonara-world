import { useMemo } from "react";
import { Copy, AlertTriangle, ShieldCheck, AlertCircle } from "lucide-react";
import { auditDM, PLATFORMS, type Channel, type AuditResult } from "@/lib/dmAudit";
import { toast } from "@/hooks/use-toast";

interface Props {
  text: string;
  channel: Channel;
  onCopy?: () => void;
  index: number;
}

const LEVEL_TONE: Record<AuditResult["level"], string> = {
  safe:   "border-emerald-500/40 bg-emerald-500/5",
  warn:   "border-yellow-500/50 bg-yellow-500/5",
  danger: "border-destructive/60 bg-destructive/5",
};

const LEVEL_LABEL: Record<AuditResult["level"], string> = {
  safe: "✓ 안전", warn: "⚠ 주의", danger: "✕ 위험",
};

export default function DMVariantCard({ text, channel, onCopy, index }: Props) {
  const audit = useMemo(() => auditDM(text, channel), [text, channel]);
  const spec = PLATFORMS[channel];

  const copy = async () => {
    if (audit.level === "danger" && audit.banned.length > 0) {
      const ok = window.confirm("⚠ 금지 표현이 감지됐습니다. 그래도 복사할까요?\n\n" + audit.banned.map(b => `• ${b.label}: ${b.suggestion}`).join("\n"));
      if (!ok) return;
    }
    try {
      await navigator.clipboard.writeText(text);
      onCopy?.();
      toast({ title: "✓ 복사됨", description: `#${index + 1} 변형` });
    } catch {
      toast({ title: "복사 실패", variant: "destructive" });
    }
  };

  return (
    <div className={`rounded-2xl p-3 border ${LEVEL_TONE[audit.level]}`}>
      <div className="flex items-center justify-between mb-2 gap-2 flex-wrap">
        <div className="flex items-center gap-2 text-[10px] font-bold tracking-wider">
          <span className="text-primary">#{index + 1}</span>
          <span className="opacity-70">{spec.emoji} {spec.label}</span>
          <span className={`tabular-nums ${audit.lengthOk ? "text-emerald-500" : "text-yellow-500"}`}>
            {audit.length}자
          </span>
          <span className="opacity-50">· 링크 {audit.linkCount} · 이모지 {audit.emojiCount}</span>
        </div>
        <span className={`text-[10px] font-black tabular-nums px-2 py-0.5 rounded-full border ${
          audit.level === "safe" ? "border-emerald-500/40 text-emerald-500"
          : audit.level === "warn" ? "border-yellow-500/40 text-yellow-500"
          : "border-destructive/40 text-destructive"
        }`}>
          {LEVEL_LABEL[audit.level]} · {audit.riskScore}
        </span>
      </div>

      <p className="text-xs text-foreground/90 whitespace-pre-line break-keep leading-relaxed mb-2">{text}</p>

      {(audit.banned.length > 0 || audit.notes.length > 0) && (
        <div className="space-y-1 mb-2 text-[11px]">
          {audit.banned.map((b, i) => (
            <div key={`b${i}`} className="flex items-start gap-1.5 text-destructive">
              <AlertCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
              <span><b>{b.label}</b> — {b.suggestion}</span>
            </div>
          ))}
          {audit.notes.map((n, i) => (
            <div key={`n${i}`} className="flex items-start gap-1.5 text-yellow-500/90">
              <AlertTriangle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
              <span>{n}</span>
            </div>
          ))}
          {audit.banned.length === 0 && audit.notes.length === 0 && (
            <div className="flex items-center gap-1 text-emerald-500/90">
              <ShieldCheck className="w-3.5 h-3.5" /> 검수 통과
            </div>
          )}
        </div>
      )}

      <button
        onClick={copy}
        className="text-[11px] font-bold flex items-center gap-1 px-2 py-1 rounded-md bg-primary/15 text-primary hover:bg-primary/25 min-h-[32px]"
      >
        <Copy className="w-3 h-3" /> 복사
      </button>
    </div>
  );
}
