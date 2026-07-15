import Link from "next/link";
import { Logo } from "./logo";

const COLUMNS: { title: string; links: { label: string; href: string }[] }[] = [
  {
    title: "Product",
    links: [
      { label: "Features", href: "/features" },
      { label: "Models", href: "/models" },
      { label: "Pricing", href: "/pricing" },
      { label: "Marketplace", href: "/app/marketplace" },
    ],
  },
  {
    title: "Workflow",
    links: [
      { label: "Link to Video", href: "/features#link-to-video" },
      { label: "Pattern scripts", href: "/features#scripts" },
      { label: "Beat review", href: "/features#review" },
      { label: "Publish", href: "/features#publish" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "About", href: "/about" },
      { label: "Blog", href: "/blog" },
      { label: "Careers", href: "/careers" },
      { label: "Contact", href: "mailto:hello@sellcast.ai" },
    ],
  },
  {
    title: "Legal",
    links: [
      { label: "Privacy", href: "/privacy" },
      { label: "Terms", href: "/terms" },
      { label: "Refunds", href: "/refunds" },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="border-t border-border bg-muted/40">
      <div className="container-page py-16">
        <div className="grid gap-12 lg:grid-cols-[1.4fr_repeat(4,1fr)]">
          <div className="max-w-xs">
            <Logo href={null} />
            <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
              Lumi turns any product into scroll-stopping shoppable video —
              grounded in real viral patterns, not guesswork.
            </p>
          </div>
          {COLUMNS.map((col) => (
            <div key={col.title}>
              <h4 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                {col.title}
              </h4>
              <ul className="mt-4 space-y-2.5">
                {col.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-sm text-ink-soft transition-colors hover:text-brand-700"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-14 flex flex-col items-center justify-between gap-4 border-t border-border pt-8 text-sm text-muted-foreground sm:flex-row">
          <p>© {new Date().getFullYear()} Sellcast. Lumi is a Sellcast product.</p>
          <p>Made for sellers who&rsquo;d rather sell than film.</p>
        </div>
      </div>
    </footer>
  );
}
