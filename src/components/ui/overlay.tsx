"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { AnimatePresence, motion } from "motion/react";
import { X } from "lucide-react";
import { DUR, EASE_OUT, RISE_Y } from "./motion";
import { cn } from "@/lib/utils";

type OverlayProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
};

/* Native <dialog> + showModal() supplies the accessibility contract for free:
   top-layer focus trap, Escape (cancel event), aria-modal semantics, and
   focus restore to the opener on close. We only add motion and a scroll lock.
   The dialog itself is a transparent full-screen container so the backdrop
   and panel can animate with the shared motion language. */
function Shell({
  onClose,
  title,
  className,
  children,
}: {
  onClose: () => void;
  title: string;
  className?: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    dialog?.showModal();
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      // close() (not just removal) is what restores focus to the opener
      dialog?.close();
      document.body.style.overflow = prev;
    };
  }, []);

  return (
    <dialog
      ref={ref}
      aria-label={title}
      onCancel={(e) => {
        // keep the dialog open so AnimatePresence can run the exit animation
        e.preventDefault();
        onClose();
      }}
      className={cn(
        "fixed inset-0 m-0 h-full max-h-none w-full max-w-none bg-transparent p-0 text-inherit backdrop:bg-transparent",
        className,
      )}
    >
      <motion.div
        className="absolute inset-0 bg-ink/40"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: DUR.fast }}
        onClick={onClose}
      />
      {children}
    </dialog>
  );
}

function Header({ title, onClose }: { title: string; onClose: () => void }) {
  const t = useTranslations("shared.overlay");

  return (
    <div className="mb-4 flex items-center justify-between gap-4">
      <h2 className="font-display text-lg font-bold text-ink">{title}</h2>
      <button
        type="button"
        aria-label={t("close")}
        onClick={onClose}
        className="shrink-0 rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-ink"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

/** Centered confirmation/detail dialog. */
export function Modal({ open, onClose, title, children }: OverlayProps) {
  return (
    <AnimatePresence>
      {open && (
        <Shell onClose={onClose} title={title} className="grid place-items-center px-4">
          <motion.div
            className="relative w-full max-w-md rounded-card border border-border bg-card-elevated p-6 shadow-card"
            initial={{ opacity: 0, y: RISE_Y, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.97 }}
            transition={{ duration: DUR.base, ease: EASE_OUT }}
          >
            <Header title={title} onClose={onClose} />
            {children}
          </motion.div>
        </Shell>
      )}
    </AnimatePresence>
  );
}

/** Right-side panel for secondary content that shouldn't leave the page. */
export function Drawer({ open, onClose, title, children }: OverlayProps) {
  return (
    <AnimatePresence>
      {open && (
        <Shell onClose={onClose} title={title}>
          <motion.div
            className="absolute inset-y-0 right-0 w-full max-w-lg overflow-y-auto overscroll-contain border-l border-border bg-card-elevated p-6"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ duration: DUR.base, ease: EASE_OUT }}
          >
            <Header title={title} onClose={onClose} />
            {children}
          </motion.div>
        </Shell>
      )}
    </AnimatePresence>
  );
}
