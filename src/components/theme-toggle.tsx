"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useTranslations } from "next-intl";
import { useTheme, type Theme } from "./theme-provider";
import { cn } from "@/lib/utils";

type ThemeLabelKey = "light" | "system" | "dark";

const OPTIONS: { value: Theme; Icon: typeof Sun; labelKey: ThemeLabelKey }[] = [
  { value: "light", Icon: Sun, labelKey: "light" },
  { value: "system", Icon: Monitor, labelKey: "system" },
  { value: "dark", Icon: Moon, labelKey: "dark" },
];

/* The selected option's pill is styled in globals.css off the `data-theme`
   attribute the no-flash script stamps on <html> before paint, keyed to the
   `data-theme-option` below — never from `theme` state here, which would paint
   "System" on the server snapshot and flip after hydration. */
export function ThemeToggle({ className }: { className?: string }) {
  const t = useTranslations("shared.theme");
  const { theme, setTheme } = useTheme();

  return (
    <div
      role="radiogroup"
      aria-label={t("label")}
      className={cn(
        "inline-flex items-center gap-0.5 rounded-full border border-border bg-card p-0.5",
        className,
      )}
    >
      {OPTIONS.map(({ value, Icon, labelKey }) => {
        const label = t(labelKey);
        return (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={theme === value}
            aria-label={label}
            title={label}
            data-theme-option={value}
            onClick={() => setTheme(value)}
            className="inline-flex h-7 w-7 items-center justify-center rounded-full text-muted-foreground transition-colors hover:text-ink"
          >
            <Icon className="h-3.5 w-3.5" />
          </button>
        );
      })}
    </div>
  );
}
