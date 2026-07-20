"use client";

import { useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Menu, X } from "lucide-react";
import { Logo } from "./logo";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { LanguageSwitcher } from "@/components/language-switcher";
import { cn } from "@/lib/utils";

const NAV = [
  { key: "features", href: "/features" },
  { key: "howItWorks", href: "/#how" },
  { key: "models", href: "/models" },
  { key: "pricing", href: "/pricing" },
] as const;

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const t = useTranslations("nav");
  const tc = useTranslations("marketing.header");

  return (
    <header className="sticky top-0 z-50 border-b border-border/70 glass">
      <div className="container-page flex h-16 items-center justify-between gap-6">
        <Logo />

        <nav className="hidden items-center gap-1 md:flex">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-full px-3.5 py-2 text-sm font-medium text-ink-soft transition-colors hover:bg-muted hover:text-ink"
            >
              {t(item.key)}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          <LanguageSwitcher />
          <ThemeToggle className="mr-1" />
          <Button href="/login" variant="ghost" size="sm">
            {tc("signIn")}
          </Button>
          <Button href="/signup" variant="primary" size="sm">
            {tc("startFree")}
          </Button>
        </div>

        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="inline-flex h-10 w-10 items-center justify-center rounded-full text-ink md:hidden"
          aria-label={tc("toggleMenu")}
          aria-expanded={open}
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      <div
        className={cn(
          "overflow-hidden border-t border-border/70 bg-card/95 md:hidden",
          open ? "max-h-96" : "max-h-0",
          "transition-[max-height] duration-300",
        )}
      >
        <div className="container-page flex flex-col gap-1 py-4">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              className="rounded-xl px-3 py-2.5 text-sm font-medium text-ink-soft hover:bg-muted"
            >
              {t(item.key)}
            </Link>
          ))}
          <div className="mt-2 flex flex-col gap-2">
            <div className="flex items-center justify-between rounded-xl bg-muted px-3 py-2">
              <span className="text-sm font-medium text-ink-soft">{tc("language")}</span>
              <LanguageSwitcher />
            </div>
            <div className="flex items-center justify-between rounded-xl bg-muted px-3 py-2">
              <span className="text-sm font-medium text-ink-soft">{tc("theme")}</span>
              <ThemeToggle />
            </div>
            <Button href="/login" variant="outline" size="md">
              {tc("signIn")}
            </Button>
            <Button href="/signup" variant="primary" size="md">
              {tc("startFree")}
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}
