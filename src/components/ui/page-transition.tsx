/**
 * PageTransition — subtle fade + 8px translateY wrapper.
 * Respects prefers-reduced-motion. Safe to wrap any route content.
 */
import * as React from "react";
import { useLocation } from "react-router-dom";
import { prefersReducedMotion } from "@/lib/haptics";

export default function PageTransition({ children }: { children: React.ReactNode }) {
  const loc = useLocation();
  const reduced = React.useMemo(prefersReducedMotion, []);
  const [key, setKey] = React.useState(loc.pathname);

  React.useEffect(() => {
    setKey(loc.pathname);
  }, [loc.pathname]);

  if (reduced) return <>{children}</>;

  return (
    <div
      key={key}
      className="animate-[pt-enter_220ms_cubic-bezier(0.2,0.7,0.2,1)_both]"
    >
      <style>{`
        @keyframes pt-enter {
          from { opacity: 0; transform: translate3d(0, 8px, 0); }
          to   { opacity: 1; transform: translate3d(0, 0, 0); }
        }
      `}</style>
      {children}
    </div>
  );
}
