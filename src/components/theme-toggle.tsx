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
            onClick={() => setTheme(value)}
            className={cn(
              "inline-flex h-7 w-7 items-center justify-center rounded-full transition-colors",
              theme === value
                ? "bg-accent text-accent-foreground"
                : "text-muted-foreground hover:text-ink",
            )}
          >
            <Icon className="h-3.5 w-3.5" />
          </button>
        );
      })}
    </div>
  );
}
