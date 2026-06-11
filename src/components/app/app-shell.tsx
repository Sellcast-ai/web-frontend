"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { Store, Package, Clapperboard, User, Sparkles, LogOut, Loader2 } from "lucide-react";
import { Logo } from "@/components/marketing/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api/client";
import { useCurrentUser } from "@/lib/api/hooks";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/app/marketplace", label: "Marketplace", Icon: Store },
  { href: "/app/products", label: "My Products", Icon: Package },
  { href: "/app/videos", label: "My Videos", Icon: Clapperboard },
  { href: "/app/profile", label: "Profile", Icon: User },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const qc = useQueryClient();
  const { data: user, isLoading } = useCurrentUser();

  // client-side gate: if the session is gone (e.g. expired), bounce to login
  useEffect(() => {
    if (!isLoading && user === null) router.replace("/login");
  }, [isLoading, user, router]);

  async function logout() {
    await api.logout().catch(() => undefined);
    qc.clear();
    router.replace("/login");
  }

  if (isLoading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-brand-500" />
      </div>
    );
  }

  const isActive = (href: string) => pathname.startsWith(href);

  return (
    <div className="min-h-screen md:grid md:grid-cols-[16rem_1fr]">
      {/* ---- desktop sidebar ---- */}
      <aside className="sticky top-0 hidden h-screen flex-col border-r border-border bg-card/60 p-4 md:flex">
        <div className="px-2 py-2">
          <Logo />
        </div>

        <Button href="/app/studio" size="md" className="mt-4 w-full">
          <Sparkles className="h-4 w-4" />
          New video
        </Button>

        <nav className="mt-6 flex flex-col gap-1">
          {NAV.map(({ href, label, Icon }) => (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors",
                isActive(href)
                  ? "bg-accent text-accent-foreground"
                  : "text-ink-soft hover:bg-muted",
              )}
            >
              <Icon className="h-[18px] w-[18px]" />
              {label}
            </Link>
          ))}
        </nav>

        <div className="mt-auto space-y-3">
          <ThemeToggle className="w-full justify-center" />
          <div className="flex items-center gap-3 rounded-xl border border-border p-2.5">
            <Avatar user={user} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-ink">
                {user.display_name}
              </p>
              <p className="truncate text-xs text-muted-foreground">
                {user.phone_number ?? user.email ?? "Signed in"}
              </p>
            </div>
            <button
              type="button"
              onClick={logout}
              aria-label="Log out"
              className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-rose"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* ---- mobile top bar ---- */}
      <header className="sticky top-0 z-40 flex items-center justify-between border-b border-border glass px-4 py-3 md:hidden">
        <Logo />
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <button
            type="button"
            onClick={logout}
            aria-label="Log out"
            className="rounded-lg p-2 text-muted-foreground hover:bg-muted"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </header>

      {/* ---- content ---- */}
      <main className="min-w-0 pb-24 md:pb-0">{children}</main>

      {/* ---- mobile bottom tab bar (echoes the iOS tab bar) ---- */}
      <nav className="fixed inset-x-0 bottom-0 z-40 flex items-center justify-around border-t border-border glass px-2 py-2 md:hidden">
        <Link
          href="/app/studio"
          className="flex flex-col items-center gap-0.5 rounded-lg px-3 py-1 text-[11px] font-semibold text-brand-700"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-gradient text-white">
            <Sparkles className="h-4 w-4" />
          </span>
          New
        </Link>
        {NAV.map(({ href, label, Icon }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex flex-col items-center gap-0.5 rounded-lg px-3 py-1 text-[11px] font-medium",
              isActive(href) ? "text-brand-700" : "text-muted-foreground",
            )}
          >
            <Icon className="h-5 w-5" />
            {label}
          </Link>
        ))}
      </nav>
    </div>
  );
}

function Avatar({ user }: { user: { display_name: string; avatar_url: string | null } }) {
  if (user.avatar_url) {
    // eslint-disable-next-line @next/next/no-img-element
    return (
      <img
        src={user.avatar_url}
        alt=""
        className="h-9 w-9 rounded-full object-cover"
      />
    );
  }
  const initial = user.display_name?.trim()?.[0]?.toUpperCase() ?? "U";
  return (
    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-gradient text-sm font-bold text-white">
      {initial}
    </span>
  );
}
