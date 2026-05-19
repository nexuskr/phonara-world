/**
 * Phase 2 PF v2 — FairnessVerifier modal.
 * Paste server_seed + commit hash + nonce → local sha256 + server RPC verify.
 * Imperial card + gradient-gold + reduced-motion safe.
 */
import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { ShieldCheck, ShieldAlert, Copy, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { sha256Hex, timingSafeEqualHex } from "../pf/crypto";
import { supabase } from "@/integrations/supabase/client";

export interface FairnessVerifierProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  defaultSeed?: string;
  defaultHash?: string;
  defaultNonce?: number;
}

type Status = "idle" | "checking" | "ok" | "fail";

export function FairnessVerifier({
  open,
  onOpenChange,
  defaultSeed = "",
  defaultHash = "",
  defaultNonce = 0,
}: FairnessVerifierProps) {
  const [seed, setSeed] = useState(defaultSeed);
  const [hash, setHash] = useState(defaultHash);
  const [nonce, setNonce] = useState<number>(defaultNonce);
  const [status, setStatus] = useState<Status>("idle");
  const [copied, setCopied] = useState<"seed" | "hash" | null>(null);

  useEffect(() => {
    if (open) {
      setSeed(defaultSeed);
      setHash(defaultHash);
      setNonce(defaultNonce);
      setStatus("idle");
    }
  }, [open, defaultSeed, defaultHash, defaultNonce]);

  const handleVerify = async () => {
    if (!seed || !hash) {
      setStatus("fail");
      return;
    }
    setStatus("checking");
    try {
      const localHash = await sha256Hex(seed.trim());
      const localOk = timingSafeEqualHex(localHash, hash.trim().toLowerCase());
      const { data, error } = await supabase.rpc("imperial_pf_verify", {
        p_seed: seed.trim(),
        p_hash: hash.trim(),
        p_nonce: Number(nonce) || 0,
      });
      const serverOk = !error && data === true;
      setStatus(localOk && serverOk ? "ok" : "fail");
    } catch {
      setStatus("fail");
    }
  };

  const copy = async (kind: "seed" | "hash", value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(kind);
      setTimeout(() => setCopied(null), 1200);
    } catch {
      /* noop */
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="imperial-card max-w-md">
        <DialogHeader>
          <DialogTitle className="text-gradient-gold flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            Provably Fair 검증
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            서버 시드(reveal) + 커밋 해시 + 라운드 nonce 를 입력하면 로컬 SHA-256 과
            서버 검증 RPC 가 동시에 확인합니다.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 text-xs">
          <Field
            label="Server seed (reveal)"
            value={seed}
            onChange={setSeed}
            onCopy={() => copy("seed", seed)}
            copied={copied === "seed"}
            placeholder="64-hex"
          />
          <Field
            label="Commit hash"
            value={hash}
            onChange={setHash}
            onCopy={() => copy("hash", hash)}
            copied={copied === "hash"}
            placeholder="sha256(seed) — 64-hex"
          />
          <div className="space-y-1.5">
            <Label className="text-[11px] uppercase tracking-wide text-muted-foreground">
              Nonce
            </Label>
            <Input
              type="number"
              inputMode="numeric"
              value={nonce}
              onChange={(e) => setNonce(Number(e.target.value) || 0)}
              className="h-9 font-mono text-xs"
            />
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between gap-3">
          <StatusPill status={status} />
          <Button
            type="button"
            onClick={handleVerify}
            disabled={status === "checking" || !seed || !hash}
            className="gradient-gold text-background hover:opacity-90"
          >
            지금 검증
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Field({
  label,
  value,
  onChange,
  onCopy,
  copied,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  onCopy: () => void;
  copied: boolean;
  placeholder?: string;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <Label className="text-[11px] uppercase tracking-wide text-muted-foreground">
          {label}
        </Label>
        <button
          type="button"
          onClick={onCopy}
          disabled={!value}
          className="inline-flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground disabled:opacity-40"
          aria-label="복사"
        >
          {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
          {copied ? "복사됨" : "복사"}
        </button>
      </div>
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={cn("h-9 font-mono text-xs")}
        spellCheck={false}
        autoComplete="off"
      />
    </div>
  );
}

function StatusPill({ status }: { status: Status }) {
  if (status === "idle") return <span className="text-[11px] text-muted-foreground">검증 대기</span>;
  if (status === "checking") return <span className="text-[11px] text-muted-foreground">검증 중…</span>;
  if (status === "ok") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-primary/40 bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-gradient-gold motion-safe:animate-in motion-safe:fade-in">
        <ShieldCheck className="h-3 w-3 text-primary" />
        ✓ 일치 (로컬+서버)
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-destructive/40 bg-destructive/10 px-2 py-0.5 text-[11px] font-semibold text-destructive">
      <ShieldAlert className="h-3 w-3" />
      ✗ 불일치
    </span>
  );
}
