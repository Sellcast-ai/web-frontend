"use client";

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { useReducedMotion } from "motion/react";
import { Volume2, VolumeX } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

/* Shared player for the showcase slots. The poster carries the slot until the
   clip plays (fetched as the slot nears the viewport unless `eagerPoster`), only
   the container metadata is warmed just before the tile reaches the viewport
   (the media itself streams on play, so the wall tiles entering view together
   can't burst-fetch every clip in full), and under reduced motion the clip
   never plays (so it never loads either). `active` is a second gate on top of
   visibility (the hero uses it to hold the clip until the pipeline reaches its
   rendered step); every activation restarts the loop from the first frame.
   `onDuration` reports the clip length once known, so a caller pacing itself
   against the footage doesn't have to hardcode it.
   Renders the <video> plus a corner sound toggle pinned to the slot's top-right,
   so mount it inside a positioned frame and leave that corner free. */

/* The clips carry real voice, but autoplay with sound is blocked outright, so
   every clip starts muted behind a user-operated toggle. Only one may be loud
   at a time - two voices at once is worse than none - so ownership lives
   module-wide and every mounted player subscribes to it. */
const soundSubscribers = new Set<() => void>();
let soundOwner: string | null = null;

const neverChanges = () => () => {};

function claimSound(owner: string | null) {
  soundOwner = owner;
  for (const notify of soundSubscribers) notify();
}

/* `play()` also rejects with AbortError when a later pause()/load() interrupts
   it, which is routine here - only a policy refusal means sound isn't allowed. */
const refusedForSound = (err: unknown) =>
  err instanceof DOMException && err.name === "NotAllowedError";

/** Fraction of a slot that must be on screen before its clip plays. */
const PLAY_RATIO = 0.4;

export function ShowcaseVideo({
  src,
  poster,
  className,
  active = true,
  eagerPoster = false,
  onDuration,
}: {
  src: string;
  poster?: string;
  className?: string;
  active?: boolean;
  /** Fetch the poster with the page instead of waiting for the slot to come
      near. Only the above-the-fold slot should: a `<video poster>` loads even
      under `preload="none"`, so a wall of them is a burst of eager image
      fetches and decodes competing with the first paint of the text above. */
  eagerPoster?: boolean;
  onDuration?: (seconds: number) => void;
}) {
  const t = useTranslations("marketing.landing.sound");
  const reduced = useReducedMotion();
  const ref = useRef<HTMLVideoElement>(null);
  const [onScreen, setOnScreen] = useState(false);
  const [posterNear, setPosterNear] = useState(eagerPoster);
  const id = useId();
  /* The toggle is client-only: `reduced` is unknown while server-rendering, so
     deciding there would hydrate a different tree than the browser wants. */
  const hydrated = useSyncExternalStore(
    neverChanges,
    () => true,
    () => false,
  );
  const subscribe = useCallback(
    (onChange: () => void) => {
      soundSubscribers.add(onChange);
      return () => {
        soundSubscribers.delete(onChange);
        if (soundOwner === id) claimSound(null);
      };
    },
    [id],
  );
  const loud = useSyncExternalStore(
    subscribe,
    () => soundOwner === id,
    () => false,
  );

  /* Deliberately not gated on `reduced`: under reduced motion nothing plays, so
     the poster is the only thing the slot ever shows and it still has to arrive. */
  useEffect(() => {
    const el = ref.current;
    if (!el || posterNear) return;
    const near = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        setPosterNear(true);
        near.disconnect();
      },
      { rootMargin: "300px" },
    );
    near.observe(el);
    return () => near.disconnect();
  }, [posterNear]);

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
    /* A real share of the tile has to be on screen before it plays, not the
       single pixel `isIntersecting` accepts: the wall is five clips, and five
       concurrent 720x1280 H.264 decodes can exceed iOS Safari's simultaneous
       hardware-decode limit on older devices, where the overflow tiles hold a
       black frame. Compare the ratio rather than `isIntersecting`, which stays
       true all the way down to 0 and so would never pause a leaving tile. */
    const visible = new IntersectionObserver(
      ([entry]) => setOnScreen(entry.intersectionRatio >= PLAY_RATIO),
      { threshold: [0, PLAY_RATIO] },
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
      /* Re-activation happens from a timer/observer, not a user gesture, so an
         unmuted clip can be refused outright. Fall back to silent playback
         rather than holding a frozen first frame. */
      el.play().catch((err) => {
        if (el.muted || !refusedForSound(err)) return;
        el.muted = true;
        if (soundOwner === id) claimSound(null);
        el.play().catch(() => {});
      });
    } else el.pause();
  }, [onScreen, active, reduced, id]);

  /* Only the losing side runs here: unmuting must happen inside the click that
     carries the user activation (WebKit pauses a clip unmuted without one), so
     the toggle writes `muted` itself and this just silences a clip that another
     player took ownership from. */
  useEffect(() => {
    const el = ref.current;
    if (el && !loud) el.muted = true;
  }, [loud]);

  return (
    <>
      <video
        ref={ref}
        className={className}
        src={src}
        poster={posterNear ? poster : undefined}
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
      {/* Mounted for the whole replay cycle so it never leaves the tab order:
          an inactive slot can still be armed ahead of the clip appearing. Under
          reduced motion nothing plays, so there is nothing to unmute. */}
      {hydrated && !reduced && (
        <button
          type="button"
          onClick={() => {
            const el = ref.current;
            const next = !loud;
            claimSound(next ? id : null);
            if (!el) return;
            el.muted = !next;
            if (next && onScreen && active)
              el.play().catch((err) => {
                if (!refusedForSound(err)) return;
                el.muted = true;
                if (soundOwner === id) claimSound(null);
                el.play().catch(() => {});
              });
          }}
          aria-label={loud ? t("mute") : t("unmute")}
          title={loud ? t("mute") : t("unmute")}
          /* Sits back over the footage until the slot is hovered or the button
             is focused, so a wall of clips isn't a wall of buttons. That recede
             only applies where the device can hover: a touch device has neither
             hover nor focus-visible before a tap, so a dimmed white glyph over
             near-white footage would be its permanent state. It also stays
             fully opaque while loud - that one must never be hard to find - and
             it is never hidden or shrunk, so the hit target is constant.
             The ::after box widens that target to ~48px for touch without
             growing the 28px dot the design wants. */
          className={cn(
            "absolute right-3 top-3 z-20 flex h-7 w-7 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-sm transition-opacity duration-300 after:absolute after:-inset-2.5 after:content-[''] hover:!opacity-100 focus-visible:!opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80 group-hover:opacity-100",
            loud ? "opacity-100" : "[@media(hover:hover)]:opacity-55",
          )}
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
