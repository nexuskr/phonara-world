import { useTheme } from "next-themes";
import { Toaster as Sonner, toast } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

/**
 * Global Sonner toaster — luxury glass styling with design tokens.
 * App code should call `notify.*` from `@/lib/notify` instead of `toast` directly.
 */
const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme();

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      position="top-center"
      duration={4200}
      closeButton
      toastOptions={{
        classNames: {
          // Warm King: glass + amber inner ring + deep golden shadow + 24px radius
          toast:
            "group toast group-[.toaster]:bg-card/90 group-[.toaster]:text-foreground group-[.toaster]:border group-[.toaster]:border-amber-300/25 group-[.toaster]:backdrop-blur-2xl group-[.toaster]:shadow-[0_12px_40px_-8px_hsl(35_85%_45%/0.35),0_2px_0_hsl(38_92%_60%/0.15)_inset] group-[.toaster]:rounded-[24px] group-[.toaster]:px-4 group-[.toaster]:py-3.5",
          title: "group-[.toast]:font-bold group-[.toast]:tracking-wide group-[.toast]:text-foreground",
          description: "group-[.toast]:text-muted-foreground group-[.toast]:text-xs group-[.toast]:mt-0.5",
          actionButton:
            "group-[.toast]:bg-gradient-to-r group-[.toast]:from-amber-500 group-[.toast]:to-orange-500 group-[.toast]:text-black group-[.toast]:font-bold group-[.toast]:rounded-xl",
          cancelButton:
            "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground group-[.toast]:rounded-xl",
          success: "group-[.toaster]:border-amber-400/45 group-[.toaster]:shadow-[0_12px_40px_-8px_hsl(38_92%_55%/0.45)]",
          error: "group-[.toaster]:border-destructive/55",
          info: "group-[.toaster]:border-secondary/45",
          warning: "group-[.toaster]:border-accent/50",
        },
      }}
      {...props}
    />
  );
};

export { Toaster, toast };
