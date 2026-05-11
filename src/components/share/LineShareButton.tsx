import { MessageCircle } from "lucide-react";

interface Props {
  url: string;
  text?: string;
  size?: "sm" | "md";
  className?: string;
  label?: string;
}

/**
 * LINE 공유 버튼 — 공식 LINE Social Plugin URL 사용 (앱 없이 어디서나 동작).
 * 모바일에서 LINE 앱이 설치돼 있으면 자동으로 LINE 앱으로 열림.
 */
export default function LineShareButton({
  url,
  text = "",
  size = "md",
  className = "",
  label = "LINE 공유",
}: Props) {
  const href =
    "https://social-plugins.line.me/lineit/share?url=" +
    encodeURIComponent(url) +
    (text ? "&text=" + encodeURIComponent(text) : "");

  const h = size === "sm" ? "h-9" : "min-h-[44px] h-11";
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={label}
      className={`inline-flex items-center justify-center gap-1.5 ${h} px-4 rounded-xl text-xs font-black transition hover:scale-[1.02] ${className}`}
      style={{
        background: "linear-gradient(135deg, hsl(140 65% 45%), hsl(140 65% 35%))",
        color: "white",
      }}
    >
      <MessageCircle className="w-3.5 h-3.5" />
      {label}
    </a>
  );
}
