"use client";

import { useSyncExternalStore } from "react";
import { AnimatePresence, motion } from "motion/react";
import { CheckCircle2, AlertCircle, Info, X } from "lucide-react";
import {
  getToasts,
  subscribeToasts,
  toast,
  type ToastVariant,
} from "@/lib/toast";
import { DUR, EASE_OUT } from "./motion";

const ICONS = { success: CheckCircle2, error: AlertCircle, info: Info } as const;
const ICON_COLOR: Record<ToastVariant, string> = {
  success: "text-success",
  error: "text-rose",
  info: "text-brand-600",
};

export function Toaster() {
  const toasts = useSyncExternalStore(subscribeToasts, getToasts, getToasts);

  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 bottom-4 z-[100] flex flex-col items-center gap-2 px-4 sm:inset-x-auto sm:right-4 sm:items-end"
    >
      <AnimatePresence>
        {toasts.map((t) => {
          const Icon = ICONS[t.variant];
          return (
            <motion.div
              key={t.id}
              layout
              initial={{ opacity: 0, y: 12, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.97 }}
              transition={{ duration: DUR.base, ease: EASE_OUT }}
              className="pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-2xl border border-border bg-card-elevated p-4 shadow-soft"
            >
              <Icon className={`mt-0.5 h-5 w-5 shrink-0 ${ICON_COLOR[t.variant]}`} />
              <p className="flex-1 text-sm text-ink">{t.message}</p>
              <button
                type="button"
                aria-label="Dismiss notification"
                onClick={() => toast.dismiss(t.id)}
                className="shrink-0 text-muted-foreground transition-colors hover:text-ink"
              >
                <X className="h-4 w-4" />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
