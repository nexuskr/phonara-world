import { lazy, Suspense } from "react";
import CosmicHero from "./CosmicHero";
import CosmicTriad from "./CosmicTriad";

const CosmicBackdrop = lazy(() => import("./CosmicBackdrop"));
const CosmicSidePanel = lazy(() => import("./CosmicSidePanel"));

/**
 * 통합 Cosmic above-the-fold 섹션. Dashboard 최상단에 단독으로 마운트.
 */
export default function CosmicSection() {
  return (
    <section className="relative isolate overflow-hidden rounded-b-[2.5rem]">
      <Suspense fallback={null}>
        <CosmicBackdrop />
      </Suspense>
      <div
        aria-hidden
        className="absolute inset-x-0 bottom-0 h-32 pointer-events-none"
        style={{
          background:
            "linear-gradient(to bottom, transparent, hsl(var(--background)) 95%)",
        }}
      />
      <Suspense fallback={null}>
        <CosmicSidePanel />
      </Suspense>
      <div className="relative container pt-6 pb-10">
        <CosmicHero />
        <div className="mt-6 md:mt-10">
          <CosmicTriad />
        </div>
      </div>
    </section>
  );
}
