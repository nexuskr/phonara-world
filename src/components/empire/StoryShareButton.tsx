import { Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { track } from "@/lib/telemetry";

export default function StoryShareButton({ headline, kind }: { headline: string; kind: string }) {
  const onClick = () => {
    const url = "https://phonara.world/empire";
    const text = `${headline} — Phonara Imperial`;
    const intent = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`;
    track("cta_click", { surface: "story_share", variant: kind });
    window.open(intent, "_blank", "noopener,noreferrer");
  };
  return (
    <Button size="sm" variant="ghost" onClick={onClick} className="gap-1.5">
      <Share2 className="w-3.5 h-3.5" /> 공유
    </Button>
  );
}
