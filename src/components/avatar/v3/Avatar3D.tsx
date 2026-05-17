/**
 * Avatar3D — single-avatar preview.
 * 모바일 최우선: 2D SVG 렌더(저성능 단말 안전) + breathing animation.
 * 3D Canvas 는 별도 PR 에서 InstancedMesh 로 확장.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import type { AvatarPart, AvatarSlot } from "./types";
import { SLOT_ORDER } from "./types";

interface Props {
  equipped: Partial<Record<AvatarSlot, AvatarPart>>;
  color?: string | null;
  size?: number;
  className?: string;
}

export default function Avatar3D({ equipped, color, size = 220, className }: Props) {
  const [t, setT] = useState(0);
  const raf = useRef<number | null>(null);

  useEffect(() => {
    let mounted = true;
    const loop = () => {
      if (!mounted) return;
      setT((performance.now() / 1000) % 10000);
      raf.current = requestAnimationFrame(loop);
    };
    raf.current = requestAnimationFrame(loop);
    return () => {
      mounted = false;
      if (raf.current) cancelAnimationFrame(raf.current);
    };
  }, []);

  const breathe = useMemo(() => 1 + Math.sin(t * 1.6) * 0.018, [t]);
  const bg = equipped.background?.color_hex ?? "#0F172A";
  const aura = equipped.effect?.color_hex;
  const ringColor = color ?? equipped.cape?.color_hex ?? "#F5C518";

  return (
    <div
      className={className}
      style={{
        width: size,
        height: size,
        position: "relative",
        borderRadius: 24,
        background: `radial-gradient(120% 120% at 50% 30%, ${bg} 0%, hsl(var(--background)) 90%)`,
        overflow: "hidden",
      }}
    >
      {aura && (
        <div
          aria-hidden
          style={{
            position: "absolute",
            inset: -20,
            background: `radial-gradient(closest-side, ${aura}55, transparent 70%)`,
            filter: "blur(8px)",
            opacity: 0.9,
          }}
        />
      )}
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "grid",
          placeItems: "center",
          transform: `scale(${breathe})`,
          transition: "transform 80ms linear",
        }}
      >
        <div
          style={{
            width: size * 0.7,
            height: size * 0.7,
            borderRadius: "50%",
            background: "linear-gradient(160deg, hsl(var(--card)), hsl(var(--muted)))",
            boxShadow: `0 0 0 3px ${ringColor}44, 0 16px 40px hsl(var(--background) / 0.6)`,
            display: "grid",
            placeItems: "center",
            fontSize: size * 0.32,
            lineHeight: 1,
          }}
        >
          <span aria-hidden>
            {equipped.face?.emoji ?? "🙂"}
          </span>
        </div>
      </div>
      <div style={{ position: "absolute", top: 10, left: 0, right: 0, display: "flex", justifyContent: "center", gap: 6 }}>
        {SLOT_ORDER.filter((s) => equipped[s]?.emoji).slice(0, 6).map((s) => (
          <span key={s} style={{ fontSize: 18 }}>{equipped[s]?.emoji}</span>
        ))}
      </div>
      {equipped.title?.name && (
        <div
          style={{
            position: "absolute",
            bottom: 12,
            left: 0,
            right: 0,
            textAlign: "center",
            fontSize: 11,
            letterSpacing: "0.2em",
            color: ringColor,
            textTransform: "uppercase",
            fontWeight: 700,
          }}
        >
          👑 {equipped.title.name}
        </div>
      )}
    </div>
  );
}
