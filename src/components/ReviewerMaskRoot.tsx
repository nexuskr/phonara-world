/**
 * P8-B: 전역 Reviewer Mode 도박성 용어 마스킹.
 *
 * Reviewer Mode가 활성화되면 MutationObserver로 텍스트 노드를 감시하여
 * 룰렛/잭팟/대박/Conquest/Raid 등 단어를 중립 표현으로 일괄 치환한다.
 *
 * - input/textarea/select 내부 텍스트는 건드리지 않음 (편집 영향 X)
 * - script/style/code/pre 태그도 스킵
 * - aria-busy="masking" 속성으로 자기 변경 재귀 방지
 * - Reviewer Mode OFF 시 옵저버 자동 정리
 */
import { useEffect } from "react";
import { useReviewerMode } from "@/lib/reviewerMode";

const TERM_MAP: Record<string, string> = {
  룰렛: "시뮬레이션 챌린지",
  잭팟: "시즌 리워드",
  Jackpot: "Seasonal Reward",
  JACKPOT: "SEASONAL REWARD",
  대박: "큰 보상",
  당첨: "획득",
  베팅: "참여",
  도박: "게임",
  배당: "보상",
  Conquest: "Expansion",
  CONQUEST: "EXPANSION",
  정복: "확장",
  Raid: "Quest",
  RAID: "QUEST",
  약탈: "탐험",
  Recovery: "Comeback",
  회복: "재도전",
  "근접 실패": "아쉬운 시도",
  "Near Miss": "Close Try",
};

const PATTERN = new RegExp(
  Object.keys(TERM_MAP)
    .sort((a, b) => b.length - a.length)
    .map((k) => k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
    .join("|"),
  "g",
);

const SKIP_TAGS = new Set([
  "SCRIPT",
  "STYLE",
  "CODE",
  "PRE",
  "TEXTAREA",
  "INPUT",
  "SELECT",
  "OPTION",
  "NOSCRIPT",
]);

function maskTextNode(node: Text) {
  const original = node.nodeValue;
  if (!original || !PATTERN.test(original)) return;
  PATTERN.lastIndex = 0;
  const masked = original.replace(PATTERN, (m) => TERM_MAP[m] ?? m);
  if (masked !== original) node.nodeValue = masked;
}

function walk(root: Node) {
  if (root.nodeType === Node.TEXT_NODE) {
    maskTextNode(root as Text);
    return;
  }
  if (root.nodeType !== Node.ELEMENT_NODE) return;
  const el = root as Element;
  if (SKIP_TAGS.has(el.tagName)) return;
  if (el.getAttribute && el.getAttribute("contenteditable") === "true") return;

  const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, {
    acceptNode(n) {
      const parent = (n as Text).parentElement;
      if (!parent) return NodeFilter.FILTER_REJECT;
      if (SKIP_TAGS.has(parent.tagName)) return NodeFilter.FILTER_REJECT;
      if (parent.closest('[data-no-mask="true"]')) return NodeFilter.FILTER_REJECT;
      return NodeFilter.FILTER_ACCEPT;
    },
  });
  let cur: Node | null;
  while ((cur = walker.nextNode())) maskTextNode(cur as Text);
}

export function ReviewerMaskRoot() {
  const on = useReviewerMode();

  useEffect(() => {
    if (!on || typeof document === "undefined") return;

    // Initial pass
    walk(document.body);

    let pending = false;
    const observer = new MutationObserver((mutations) => {
      if (pending) return;
      pending = true;
      // Coalesce into a microtask to avoid feedback loops
      queueMicrotask(() => {
        pending = false;
        for (const m of mutations) {
          if (m.type === "characterData" && m.target.nodeType === Node.TEXT_NODE) {
            maskTextNode(m.target as Text);
          } else if (m.type === "childList") {
            m.addedNodes.forEach((n) => walk(n));
          }
        }
      });
    });

    observer.observe(document.body, {
      subtree: true,
      childList: true,
      characterData: true,
    });

    return () => observer.disconnect();
  }, [on]);

  return null;
}
