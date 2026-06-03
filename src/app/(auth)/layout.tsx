import { Sparkles, ShieldCheck, Wand2 } from "lucide-react";
import { Logo } from "@/components/marketing/logo";
import { ThemeToggle } from "@/components/theme-toggle";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* brand panel */}
      <div className="bg-hero relative hidden flex-col justify-between overflow-hidden p-12 text-white lg:flex">
        <div className="bg-aurora absolute inset-0 opacity-30 mix-blend-overlay" />
        <Logo href="/" className="relative [&_span]:text-white" />
        <div className="relative max-w-md">
          <h1 className="font-display text-4xl font-bold leading-tight">
            From product link to scroll-stopping video — in minutes.
          </h1>
          <ul className="mt-8 space-y-4 text-white/90">
            {[
              { Icon: Wand2, t: "Scripts grounded in real viral patterns" },
              { Icon: Sparkles, t: "Review every beat before it renders" },
              { Icon: ShieldCheck, t: "Publish-ready 9:16 for TikTok & Reels" },
            ].map(({ Icon, t }) => (
              <li key={t} className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-full glass">
                  <Icon className="h-4 w-4" />
                </span>
                {t}
              </li>
            ))}
          </ul>
        </div>
        <p className="relative text-sm text-white/60">
          © {new Date().getFullYear()} Sellcast · Lumi
        </p>
      </div>

      {/* form panel */}
      <div className="relative flex flex-col">
        <div className="flex items-center justify-between p-6">
          <Logo href="/" className="lg:hidden" />
          <span className="hidden lg:block" />
          <ThemeToggle />
        </div>
        <div className="flex flex-1 items-center justify-center px-6 pb-16">
          <div className="w-full max-w-sm">{children}</div>
        </div>
      </div>
    </div>
  );
}
