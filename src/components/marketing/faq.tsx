"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

const FAQ_KEYS = ["q1", "q2", "q3", "q4", "q5", "q6"] as const;

export function Faq() {
  const [open, setOpen] = useState<number | null>(0);
  const t = useTranslations("marketing.faq");

  return (
    <div className="mx-auto max-w-3xl divide-y divide-border rounded-card border border-border bg-card shadow-soft">
      {FAQ_KEYS.map((key, i) => {
        const isOpen = open === i;
        return (
          <div key={key}>
            <button
              type="button"
              onClick={() => setOpen(isOpen ? null : i)}
              className="flex w-full items-center justify-between gap-4 px-6 py-5 text-left"
              aria-expanded={isOpen}
            >
              <span className="font-display text-lg font-medium text-ink">
                {t(key)}
              </span>
              <Plus
                className={cn(
                  "h-5 w-5 shrink-0 text-brand-500 transition-transform duration-300",
                  isOpen && "rotate-45",
                )}
              />
            </button>
            <div
              className={cn(
                "grid overflow-hidden px-6 transition-all duration-300",
                isOpen
                  ? "grid-rows-[1fr] pb-6 opacity-100"
                  : "grid-rows-[0fr] opacity-0",
              )}
            >
              <p className="min-h-0 text-[15px] leading-relaxed text-muted-foreground">
                {t(key.replace("q", "a"))}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
