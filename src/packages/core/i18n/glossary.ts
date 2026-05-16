/**
 * @pkg/core/i18n/glossary — v14.0 단어 정화 진입점.
 *
 * 실제 사전은 `src/lib/glossary.ts` 의 `G`. 이 파일은 미래 Turborepo 분리 시
 * `packages/core` 패키지로 그대로 옮길 수 있도록 만든 thin re-export 레이어.
 *
 * 사용:
 *   import { g } from "@pkg/core/i18n/glossary";
 *   <h1>{g("tabEarn")}</h1>
 */
import { G, type GlossaryKey } from "@/lib/glossary";

export function g(key: GlossaryKey): string {
  return G[key];
}

export const dictionary = G;
export type { GlossaryKey };
export default { g, dictionary: G };
