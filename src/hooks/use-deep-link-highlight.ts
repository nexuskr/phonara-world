/**
 * Reads ?id=... from the URL, scrolls the matching DOM node into view,
 * and returns the id so callers can apply a highlight class.
 *
 * Usage:
 *   const hi = useDeepLinkHighlight();
 *   <div data-row-id={r.id} className={cn(hi === r.id && "ring-2 ring-primary")}>
 */
import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";

export function useDeepLinkHighlight(param = "id"): string | null {
  const [sp] = useSearchParams();
  const id = sp.get(param);
  const [armed, setArmed] = useState<string | null>(id);

  useEffect(() => {
    setArmed(id);
    if (!id) return;
    // Wait one frame so list rows are mounted before scrolling.
    const t = window.setTimeout(() => {
      const node = document.querySelector<HTMLElement>(`[data-row-id="${CSS.escape(id)}"]`);
      node?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 50);
    // Auto-disarm highlight after 4s so the row goes back to normal.
    const u = window.setTimeout(() => setArmed(null), 4000);
    return () => {
      window.clearTimeout(t);
      window.clearTimeout(u);
    };
  }, [id]);

  return armed;
}
