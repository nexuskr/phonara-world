// Phase 4 S3 — Run-book quick links (static, no fetch).
const LINKS: Array<{ label: string; href: string; desc: string }> = [
  { label: "Phase 4 Launch Bible",   href: "/docs/duel/phase4-production-launch-bible.md", desc: "프로덕션 절차 + 롤백" },
  { label: "GO / NO-GO Checklist",   href: "/docs/duel/phase4-go-nogo-checklist.md",       desc: "18-item gating" },
  { label: "Mobile Shell Spec",      href: "/docs/apex/mobile-shell.md",                   desc: "Capacitor + offline" },
  { label: "Phase 3 Complete",       href: "/docs/duel/phase3-technical-bible.md",         desc: "Duel + Flywheel" },
];

export default function RunbookCard() {
  return (
    <div className="rounded-2xl border border-border bg-card/70 p-5 backdrop-blur-md">
      <div className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Run-book</div>
      <ul className="space-y-1.5">
        {LINKS.map(l => (
          <li key={l.href} className="text-sm">
            <a
              href={l.href}
              target="_blank"
              rel="noreferrer"
              className="block rounded px-2 py-1 hover:bg-muted/50"
            >
              <span className="font-medium">{l.label}</span>
              <span className="ml-2 text-xs text-muted-foreground">{l.desc}</span>
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
