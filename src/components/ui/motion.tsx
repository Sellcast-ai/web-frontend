"use client";

import { motion, type HTMLMotionProps } from "motion/react";

/* Lumi motion language - single source of durations/easing/distances.
   Every animated component imports from here; no per-page one-offs. */
export const EASE_OUT: [number, number, number, number] = [0.21, 1, 0.4, 1];
export const DUR = { fast: 0.18, base: 0.3, slow: 0.55 } as const;
export const RISE_Y = 16;

type FadeInProps = HTMLMotionProps<"div"> & { delay?: number; y?: number };

/** Fade + rise once when scrolled into view. */
export function FadeIn({ delay = 0, y = RISE_Y, ...props }: FadeInProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: DUR.slow, ease: EASE_OUT, delay }}
      {...props}
    />
  );
}

type StaggerItemProps = HTMLMotionProps<"div"> & {
  index?: number;
  pageSize?: number;
};

/** Grid/list cell that rises in on mount, staggered by its index within the
    current page of results - so "Load more" appends cascade the same way the
    initial load does. Delay caps early so long pages don't crawl. */
export function StaggerItem({
  index = 0,
  pageSize = 24,
  ...props
}: StaggerItemProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: RISE_Y }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: DUR.base,
        ease: EASE_OUT,
        delay: Math.min(index % pageSize, 11) * 0.045,
      }}
      {...props}
    />
  );
}
