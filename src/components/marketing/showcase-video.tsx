"use client";

import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "motion/react";

/* Shared player for the showcase slots. The poster carries first paint, the
   bytes are warmed just before the tile reaches the viewport but playback only
   starts once it is actually on screen, and under reduced motion the clip
   never plays (so it never loads either). */
export function ShowcaseVideo({
  src,
  poster,
  className,
  active = true,
}: {
  src: string;
  poster?: string;
  className?: string;
  active?: boolean;
}) {
  const reduced = useReducedMotion();
  const ref = useRef<HTMLVideoElement>(null);
  const [onScreen, setOnScreen] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || reduced) return;
    const warm = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        el.preload = "auto";
        el.load();
        warm.disconnect();
      },
      { rootMargin: "200px" },
    );
    const visible = new IntersectionObserver(([entry]) =>
      setOnScreen(entry.isIntersecting),
    );
    warm.observe(el);
    visible.observe(el);
    return () => {
      warm.disconnect();
      visible.disconnect();
    };
  }, [reduced]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (onScreen && active && !reduced) {
      el.currentTime = 0;
      el.play().catch(() => {});
    } else el.pause();
  }, [onScreen, active, reduced]);

  return (
    <video
      ref={ref}
      className={className}
      src={src}
      poster={poster}
      muted
      loop
      playsInline
      preload="none"
      aria-hidden="true"
    />
  );
}
