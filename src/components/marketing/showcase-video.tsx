"use client";

import {
  useEffect,
  useId,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { useReducedMotion } from "motion/react";
import { Volume2, VolumeX } from "lucide-react";
import { useTranslations } from "next-intl";

/* Shared player for the showcase slots. The poster carries first paint, only
   the container metadata is warmed just before the tile reaches the viewport
   (the media itself streams on play, so the wall tiles entering view together
   can't burst-fetch every clip in full), and under reduced motion the clip
   never plays (so it never loads either). `active` is a second gate on top of
   visibility (the hero uses it to hold the clip until the pipeline reaches its
   rendered step); every activation restarts the loop from the first frame.
   `onDuration` reports the clip length once known, so a caller pacing itself
   against the footage doesn't have to hardcode it. */

/* The clips carry real voice, but autoplay with sound is blocked outright, so
   every clip starts muted behind a user-operated toggle. Only one may be loud
   at a time - two voices at once is worse than none - so ownership lives
   module-wide and every mounted player subscribes to it. */
const soundSubscribers = new Set<(owner: string | null) => void>();
let soundOwner: string | null = null;

const neverChanges = () => () => {};

function claimSound(owner: string | null) {
  soundOwner = owner;
  for (const notify of soundSubscribers) notify(owner);
}

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
  const t = useTranslations("marketing.landing.sound");
  const reduced = useReducedMotion();
  const ref = useRef<HTMLVideoElement>(null);
  const [onScreen, setOnScreen] = useState(false);
  const id = useId();
  const [loud, setLoud] = useState(false);
  /* The toggle is client-only: `reduced` is unknown while server-rendering, so
     deciding there would hydrate a different tree than the browser wants. */
  const hydrated = useSyncExternalStore(
    neverChanges,
    () => true,
    () => false,
  );

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

  useEffect(() => {
    const notify = (owner: string | null) => setLoud(owner === id);
    soundSubscribers.add(notify);
    return () => {
      soundSubscribers.delete(notify);
      if (soundOwner === id) claimSound(null);
    };
  }, [id]);

  /* React only writes `muted` on mount, so track it imperatively. */
  useEffect(() => {
    if (ref.current) ref.current.muted = !loud;
  }, [loud]);

  return (
    <>
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
      {/* Hidden while the clip is silent anyway: under reduced motion it never
          plays, and an inactive hero slot sits behind the stage gradient. */}
      {hydrated && active && !reduced && (
        <button
          type="button"
          onClick={() => claimSound(loud ? null : id)}
          aria-label={loud ? t("mute") : t("unmute")}
          title={loud ? t("mute") : t("unmute")}
          className="absolute right-3 top-3 z-20 flex h-7 w-7 items-center justify-center rounded-full bg-black/45 text-white/90 backdrop-blur-sm transition-colors hover:bg-black/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80"
        >
          {loud ? (
            <Volume2 className="h-3.5 w-3.5" />
          ) : (
            <VolumeX className="h-3.5 w-3.5" />
          )}
        </button>
      )}
    </>
  );
}
