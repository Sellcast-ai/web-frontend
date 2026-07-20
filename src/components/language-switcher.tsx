"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { Check, Globe } from "lucide-react";
import { cn } from "@/lib/utils";

// The 9 target UI locales, listed by endonym.
// NOTE: this is the UI-language axis, separate from the Studio video-output
// language picker (VIDEO_LANGUAGES in api/types.ts, its own enabled set) - do
// not conflate the two (plan §0).
const LOCALES: { code: string; label: string; enabled: boolean }[] = [
  { code: "en", label: "English", enabled: true },
  { code: "es", label: "Español", enabled: true },
  { code: "zh", label: "简体中文", enabled: true },
  { code: "ja", label: "日本語", enabled: true },
  { code: "ko", label: "한국어", enabled: true },
  { code: "pt", label: "Português", enabled: true },
  { code: "id", label: "Bahasa Indonesia", enabled: true },
  { code: "vi", label: "Tiếng Việt", enabled: true },
  { code: "th", label: "ไทย", enabled: true },
];

// Server-readable cookie so SSR renders the chosen locale on the next request.
// Kept at module scope (not inside the component) so the DOM write isn't flagged
// by the react-hooks immutability rule.
function writeLocaleCookie(code: string) {
  document.cookie = `lumi-locale=${code}; path=/; max-age=31536000; samesite=lax`;
}

export function LanguageSwitcher({ className }: { className?: string }) {
  const t = useTranslations("languageSwitcher");
  const locale = useLocale();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click / Escape.
  useEffect(() => {
    if (!open) return;
    function onPointer(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function select(code: string) {
    setOpen(false);
    if (code === locale) return;
    writeLocaleCookie(code);
    router.refresh();
  }

  const current = LOCALES.find((l) => l.code === locale) ?? LOCALES[0];

  return (
    <div ref={ref} className={cn("relative", className)}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={t("label")}
        aria-haspopup="menu"
        aria-expanded={open}
        className="inline-flex h-9 items-center gap-1.5 rounded-full border border-border bg-card px-3 text-sm font-medium text-ink-soft transition-colors hover:bg-muted hover:text-ink"
      >
        <Globe className="h-4 w-4" />
        <span>{current.label}</span>
      </button>

      {open && (
        <div
          role="menu"
          aria-label={t("label")}
          className="absolute right-0 z-50 mt-2 min-w-44 overflow-hidden rounded-xl border border-border bg-card p-1 shadow-lg"
        >
          {LOCALES.map(({ code, label, enabled }) => (
            <button
              key={code}
              type="button"
              role="menuitemradio"
              aria-checked={code === locale}
              disabled={!enabled}
              onClick={() => select(code)}
              className={cn(
                "flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-left text-sm transition-colors",
                enabled
                  ? "text-ink hover:bg-muted"
                  : "cursor-not-allowed text-muted-foreground/60",
              )}
            >
              <span>{label}</span>
              {code === locale && <Check className="h-4 w-4 text-brand-500" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
