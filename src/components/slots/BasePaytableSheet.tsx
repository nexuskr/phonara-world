// BasePaytableSheet — Signature Slot 공용 배당표 셸.
// 트리거 버튼 + 우측 슬라이드 시트 + 헤더 + 섹션/로우 프리미티브.
// 테마별 PaytableSheet는 className/icon/sections만 주입.
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { BookOpen } from "lucide-react";
import type { CSSProperties, ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

export interface SymRow {
  emoji: string;
  name: string;
  pay: string;
}

export interface PaytableSection {
  title: string;
  /** Tailwind 그라디언트/보더 톤. ex) "from-amber-300/25 to-transparent border-amber-300/50" */
  toneClass: string;
  /** 표준 심볼 row 리스트. */
  rows?: SymRow[];
  /** rows 아래에 추가로 렌더할 자유 컨텐츠 (잭팟 설명 등). */
  extra?: ReactNode;
}

export interface BasePaytableSheetProps {
  /** 트리거 버튼 라벨 (기본 "배당표") */
  triggerLabel?: string;
  triggerClassName: string;
  triggerStyle?: CSSProperties;
  /** SheetContent의 className — 그라디언트/보더/베이스 텍스트 색 포함. */
  contentClassName: string;
  /** Sheet 제목 (ex "Wizard 2000 · Mystic Paytable") */
  title: string;
  TitleIcon?: LucideIcon;
  titleIconClassName?: string;
  titleIconStyle?: CSSProperties;
  titleClassName?: string;
  /** 트리거 버튼 안 좌측 아이콘 (기본 BookOpen) */
  TriggerIcon?: LucideIcon;
  /** 헤더 위에 들어갈 카드 (Volatility / MaxWin 강조 등) */
  topCard?: ReactNode;
  sections: PaytableSection[];
  /** 마지막 섹션 뒤 Footer (RTP/디스클레이머 등) */
  footer?: ReactNode;
  /** Row 시각 토큰 — 테마별 미세 차이 흡수. */
  rowBgClass?: string;
  rowIconBgClass?: string;
  rowIconTextClass?: string;
  rowNameClass?: string;
  rowPayClass?: string;
  sectionTitleClass?: string;
}

const DEFAULTS = {
  rowBg: "bg-slate-950/50",
  rowIconBg: "bg-violet-900/55",
  rowIconText: "text-violet-50",
  rowName: "text-foreground",
  rowPay: "text-foreground/80",
  sectionTitle: "text-foreground",
};

export default function BasePaytableSheet({
  triggerLabel = "배당표",
  triggerClassName,
  triggerStyle,
  contentClassName,
  title,
  TitleIcon,
  titleIconClassName,
  titleIconStyle,
  titleClassName,
  TriggerIcon = BookOpen,
  topCard,
  sections,
  footer,
  rowBgClass = DEFAULTS.rowBg,
  rowIconBgClass = DEFAULTS.rowIconBg,
  rowIconTextClass = DEFAULTS.rowIconText,
  rowNameClass = DEFAULTS.rowName,
  rowPayClass = DEFAULTS.rowPay,
  sectionTitleClass = DEFAULTS.sectionTitle,
}: BasePaytableSheetProps) {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={triggerClassName}
          style={triggerStyle}
        >
          <TriggerIcon className="h-4 w-4 mr-1.5" />
          {triggerLabel}
        </Button>
      </SheetTrigger>
      <SheetContent
        side="right"
        className={`w-full sm:max-w-md overflow-y-auto ${contentClassName}`}
      >
        <SheetHeader>
          <SheetTitle className={`flex items-center gap-2 ${titleClassName ?? ""}`}>
            {TitleIcon && (
              <TitleIcon
                className={`h-5 w-5 ${titleIconClassName ?? ""}`}
                style={titleIconStyle}
              />
            )}
            {title}
          </SheetTitle>
        </SheetHeader>

        <div className="mt-5 space-y-5">
          {topCard}
          {sections.map((s) => (
            <PaytableSectionCard
              key={s.title}
              section={s}
              titleClass={sectionTitleClass}
              rowBgClass={rowBgClass}
              rowIconBgClass={rowIconBgClass}
              rowIconTextClass={rowIconTextClass}
              rowNameClass={rowNameClass}
              rowPayClass={rowPayClass}
            />
          ))}
          {footer && <div className="pt-1 pb-4">{footer}</div>}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function PaytableSectionCard({
  section,
  titleClass,
  rowBgClass,
  rowIconBgClass,
  rowIconTextClass,
  rowNameClass,
  rowPayClass,
}: {
  section: PaytableSection;
  titleClass: string;
  rowBgClass: string;
  rowIconBgClass: string;
  rowIconTextClass: string;
  rowNameClass: string;
  rowPayClass: string;
}) {
  return (
    <section className={`rounded-xl border bg-gradient-to-b ${section.toneClass} p-3`}>
      <h3 className={`text-sm font-semibold mb-2 tracking-wide ${titleClass}`}>
        {section.title}
      </h3>
      <div className="space-y-1.5">
        {section.rows?.map((r) => (
          <PaytableRow
            key={r.name}
            row={r}
            rowBgClass={rowBgClass}
            iconBgClass={rowIconBgClass}
            iconTextClass={rowIconTextClass}
            nameClass={rowNameClass}
            payClass={rowPayClass}
          />
        ))}
        {section.extra}
      </div>
    </section>
  );
}

function PaytableRow({
  row,
  rowBgClass,
  iconBgClass,
  iconTextClass,
  nameClass,
  payClass,
}: {
  row: SymRow;
  rowBgClass: string;
  iconBgClass: string;
  iconTextClass: string;
  nameClass: string;
  payClass: string;
}) {
  return (
    <div className={`flex items-start gap-3 rounded-lg px-2.5 py-2 ${rowBgClass}`}>
      <div
        className={`w-8 h-8 shrink-0 rounded-md flex items-center justify-center text-lg font-bold ${iconBgClass} ${iconTextClass}`}
      >
        {row.emoji}
      </div>
      <div className="min-w-0 flex-1">
        <div className={`text-sm font-medium truncate ${nameClass}`}>{row.name}</div>
        <div className={`text-[11px] leading-snug ${payClass}`}>{row.pay}</div>
      </div>
    </div>
  );
}
