export function RouteFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4">
        <div className="relative w-16 h-16">
          <div className="absolute inset-0 rounded-full border-2 border-primary/20" />
          <div className="absolute inset-0 rounded-full border-2 border-t-primary border-transparent animate-spin" />
        </div>
        <p className="text-sm text-muted-foreground tracking-widest">LOADING</p>
      </div>
    </div>
  );
}
