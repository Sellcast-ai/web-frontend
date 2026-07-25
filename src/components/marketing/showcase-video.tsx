"use client";

import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "motion/react";

/* Shared player for the showcase slots. The poster carries first paint, only
   the container metadata is warmed just before the tile reaches the viewport
   (the media itself streams on play, so the six wall tiles entering view
   together can't burst-fetch every clip in full), and under reduced motion the
   clip never plays (so it never loads either). `active` is a second gate on top
   of visibility (the hero uses it to hold the clip until the pipeline reaches
   its rendered step); every activation restarts the loop from the first frame.
   `onDuration` reports the clip length once known, so a caller pacing itself
   against the footage doesn't have to hardcode it. */
export function ShowcaseVideo({
  src,
  poster,
  className,
  active = true,
  onDuration,
}: {
  src: string;
  poster?: string;
  className?: string;
  active?: boolean;
  onDuration?: (seconds: number) => void;
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
        el.preload = "metadata";
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
      onLoadedMetadata={(e) => {
        const d = e.currentTarget.duration;
        if (Number.isFinite(d) && d > 0) onDuration?.(d);
      }}
    />
  );
}
