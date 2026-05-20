/**
 * <ApexSticker /> — procedural SVG sticker for Kakao/Band/X share.
 */
import { STICKERS, type StickerMeta } from "./stickers";

interface Props {
  index?: number;
  meta?: StickerMeta;
  size?: number;
  caption?: string;
}

export function ApexSticker({ index = 1, meta, size = 320, caption }: Props) {
  const s = meta ?? STICKERS[Math.max(0, Math.min(11, index - 1))];
  const [c1, c2] = s.gradient;
  const id = `apex-sticker-${s.index}`;
  return (
    <svg width={size} height={size} viewBox="0 0 320 320" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={c1} />
          <stop offset="100%" stopColor={c2} />
        </linearGradient>
        <radialGradient id={id + "-glow"} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="rgba(255,255,255,0.55)" />
          <stop offset="100%" stopColor="rgba(255,255,255,0)" />
        </radialGradient>
      </defs>
      <rect x="8" y="8" width="304" height="304" rx="32" fill={`url(#${id})`} />
      <circle cx="160" cy="125" r="105" fill={`url(#${id}-glow)`} />
      <text
        x="160" y="135"
        textAnchor="middle"
        fontSize="78"
        fontFamily="system-ui,-apple-system,Segoe UI,sans-serif"
      >
        {s.emoji}
      </text>
      <text
        x="160" y="210"
        textAnchor="middle"
        fontSize="32"
        fontWeight="900"
        fill="#fff"
        fontFamily="system-ui,-apple-system,Segoe UI,sans-serif"
        style={{ letterSpacing: 1 }}
      >
        {s.label}
      </text>
      <text
        x="160" y="248"
        textAnchor="middle"
        fontSize="18"
        fill="rgba(255,255,255,0.92)"
        fontFamily="system-ui,-apple-system,Segoe UI,sans-serif"
      >
        {caption ?? s.caption}
      </text>
      <text
        x="160" y="288"
        textAnchor="middle"
        fontSize="14"
        fill="rgba(255,255,255,0.75)"
        fontFamily="system-ui,-apple-system,Segoe UI,sans-serif"
        style={{ letterSpacing: 4 }}
      >
        PHONARA · APEX
      </text>
    </svg>
  );
}
