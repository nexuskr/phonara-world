import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * EmptyState — unified empty/no-data placeholder
 * Uses lux design tokens. Variants: default | gold | muted | error
 */
export interface EmptyStateProps extends React.HTMLAttributes<HTMLDivElement> {
  icon?: React.ReactNode;
  title: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  variant?: "default" | "gold" | "muted" | "error";
  size?: "sm" | "md" | "lg";
}

const variantStyles: Record<NonNullable<EmptyStateProps["variant"]>, string> = {
  default: "border-border/60 bg-card/40",
  gold: "border-primary/30 bg-gradient-to-br from-primary/5 to-transparent",
  muted: "border-border/30 bg-muted/20",
  error: "border-destructive/40 bg-destructive/5",
};

const sizeStyles: Record<NonNullable<EmptyStateProps["size"]>, string> = {
  sm: "p-6 gap-2",
  md: "p-10 gap-3",
  lg: "p-14 gap-4",
};

const iconWrapStyles: Record<NonNullable<EmptyStateProps["variant"]>, string> = {
  default: "text-muted-foreground",
  gold: "text-primary",
  muted: "text-muted-foreground/70",
  error: "text-destructive",
};

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  action,
  variant = "default",
  size = "md",
  className,
  ...props
}) => (
  <div
    role="status"
    aria-live="polite"
    className={cn(
      "flex flex-col items-center justify-center text-center rounded-2xl border backdrop-blur-sm",
      "animate-liquid-in",
      variantStyles[variant],
      sizeStyles[size],
      className,
    )}
    {...props}
  >
    {icon && (
      <div className={cn("flex h-12 w-12 items-center justify-center rounded-2xl bg-background/40", iconWrapStyles[variant])}>
        {icon}
      </div>
    )}
    <div className="space-y-1">
      <p className="text-sm font-semibold text-foreground">{title}</p>
      {description && (
        <p className="text-xs text-muted-foreground max-w-xs leading-relaxed">{description}</p>
      )}
    </div>
    {action && <div className="pt-1">{action}</div>}
  </div>
);

export default EmptyState;
