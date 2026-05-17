/**
 * BottomSheet — iOS-feeling sheet built on vaul (already installed).
 *
 * Warm King polish: amber/gold top handle, backdrop blur 14px, safe-area
 * inset bottom, spring entrance. Opt-in: use in place of <Dialog/> when the
 * surface should feel native on mobile.
 *
 * Usage:
 *   <BottomSheet open={open} onOpenChange={setOpen} title="주문 패널">
 *     ...
 *   </BottomSheet>
 */
import * as React from "react";
import { Drawer as Vaul } from "vaul";
import { cn } from "@/lib/utils";

interface BottomSheetProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  title?: React.ReactNode;
  description?: React.ReactNode;
  children: React.ReactNode;
  /** Max height in viewport units. Default 88vh. */
  maxHeight?: string;
  className?: string;
}

export function BottomSheet({
  open,
  onOpenChange,
  title,
  description,
  children,
  maxHeight = "88vh",
  className,
}: BottomSheetProps) {
  return (
    <Vaul.Root open={open} onOpenChange={onOpenChange} shouldScaleBackground>
      <Vaul.Portal>
        <Vaul.Overlay className="fixed inset-0 z-[85] bg-black/55 backdrop-blur-[6px]" />
        <Vaul.Content
          className={cn(
            "fixed inset-x-0 bottom-0 z-[86] flex flex-col rounded-t-[28px]",
            "bg-card/95 backdrop-blur-2xl border-t border-x border-border/60",
            "shadow-[0_-16px_48px_-8px_hsl(35_80%_50%/0.18)]",
            "outline-none focus:outline-none",
            className,
          )}
          style={{
            maxHeight,
            paddingBottom: "max(env(safe-area-inset-bottom), 0.75rem)",
          }}
        >
          {/* Warm gold handle */}
          <div className="mx-auto mt-2.5 h-1.5 w-12 rounded-full bg-gradient-to-r from-amber-400/70 via-amber-300/90 to-amber-500/70 shadow-[0_0_12px_hsl(38_92%_60%/0.6)]" />

          {(title || description) && (
            <div className="px-5 pt-3 pb-1">
              {title && (
                <Vaul.Title className="text-base font-black tracking-wide text-foreground">
                  {title}
                </Vaul.Title>
              )}
              {description && (
                <Vaul.Description className="text-xs text-muted-foreground mt-0.5">
                  {description}
                </Vaul.Description>
              )}
            </div>
          )}

          <div className="flex-1 overflow-y-auto overscroll-contain px-1 pb-2">
            {children}
          </div>
        </Vaul.Content>
      </Vaul.Portal>
    </Vaul.Root>
  );
}

export default BottomSheet;
