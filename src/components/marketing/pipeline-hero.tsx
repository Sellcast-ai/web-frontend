"use client";

import { useEffect, useRef, useState } from "react";
import {
  AnimatePresence,
  motion,
  useInView,
  useReducedMotion,
} from "motion/react";
import {
  Check,
  CornerDownLeft,
  Loader2,
  MousePointer2,
  Sparkles,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { EASE_OUT } from "@/components/ui/motion";
import { HERO_OUTPUT_VIDEO } from "./showcase";
import { cn } from "@/lib/utils";

/* The simulated-pipeline hero: Lumi's real differentiator — link → learned
   pattern → storyboard approval → render — played as a living product surface.
   The finished state is server-rendered (rich without JS); when visible and
   motion is allowed, the whole flow replays on a loop. */

const TYPING = 1;
const READING = 2;
const PATTERN = 3;
const BEATS = 4;
const APPROVE = 5;
const RENDERING = 6;
const DONE = 7;

/* Hold per step (ms) before advancing. TYPING advances per character. */
const HOLD: Record<number, number> = {
  [READING]: 1000,
  [PATTERN]: 1300,
  [BEATS]: 1300,
  [APPROVE]: 1550,
  [RENDERING]: 2400,
  [DONE]: 4200,
};

const BEAT_KEYS = ["hook", "proof", "offer"] as const;

/* Placeholder "footage" gradients for the three storyboard thumbs. */
const THUMB_ART = [
  "linear-gradient(150deg,#3d5a63 0%,#17242a 78%)",
  "linear-gradient(150deg,#5a4a3d 0%,#221b15 78%)",
  "linear-gradient(150deg,#2f4d45 0%,#141f1c 78%)",
];

export function PipelineHero() {
  const t = useTranslations("marketing.landing.pipeline");
  const url = t("url");

  const rootRef = useRef<HTMLDivElement>(null);
  const inView = useInView(rootRef, { amount: 0.35 });
  const reduced = useReducedMotion();
  const playing = Boolean(inView && !reduced);

  /* Server-render the finished studio; replay from TYPING once playing. */
  const [step, setStep] = useState(DONE);
  const [typed, setTyped] = useState(url.length);
  const [clickDone, setClickDone] = useState(true);
  const [cycle, setCycle] = useState(0);

  useEffect(() => {
    if (!playing) return;
    if (step === TYPING) {
      if (typed >= url.length) {
        const id = setTimeout(() => setStep(READING), 420);
        return () => clearTimeout(id);
      }
      const id = setTimeout(() => setTyped((n) => n + 1), 36);
      return () => clearTimeout(id);
    }
    const hold = step === DONE && cycle === 0 ? 900 : HOLD[step];
    const id = setTimeout(() => {
      if (step === DONE) {
        setTyped(0);
        setClickDone(false);
        setCycle((c) => c + 1);
        setStep(TYPING);
      } else {
        setStep(step + 1);
      }
    }, hold);
    return () => clearTimeout(id);
  }, [playing, step, typed, cycle, url.length]);

  /* The cursor "click" flips the storyboard to approved mid-APPROVE. */
  useEffect(() => {
    if (!playing || step !== APPROVE) return;
    const id = setTimeout(() => setClickDone(true), 820);
    return () => clearTimeout(id);
  }, [playing, step]);

  /* Under reduced motion, render the finished state no matter where the
     internal replay is — a mid-session preference flip must not freeze the
     stage half-typed. */
  const shownStep = reduced ? DONE : step;
  const shownTyped = reduced ? url.length : typed;
  const approved =
    shownStep >= RENDERING || (shownStep === APPROVE && clickDone);
  const video = HERO_OUTPUT_VIDEO;

  return (
    <div
      ref={rootRef}
      className="relative overflow-hidden rounded-[1.75rem] border border-white/10 bg-gradient-to-b from-[#1b1f26] to-[#111419] shadow-card"
    >
      {/* studio chrome */}
      <div className="flex items-center justify-between border-b border-white/[0.07] px-5 py-3 sm:px-7">
        <span className="flex items-center gap-2 text-xs font-medium tracking-wide text-white/55">
          <span className="h-1.5 w-1.5 rounded-full bg-live" />
          {t("stageLabel")}
        </span>
        <span className="flex items-center gap-2">
          <StudioChip>{t("chipRatio")}</StudioChip>
          <StudioChip>{t("chipModel")}</StudioChip>
        </span>
      </div>

      <div className="grid gap-8 p-5 sm:p-7 md:grid-cols-[minmax(0,1fr)_auto] md:gap-10">
        {/* ---------------------------------------------- the work column */}
        <motion.div
          key={cycle}
          initial={cycle > 0 ? { opacity: 0 } : false}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.35, ease: EASE_OUT }}
          className="flex min-h-[335px] min-w-0 flex-col gap-3.5"
        >
          {/* URL bar */}
          <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.05] px-4 py-3">
            <span className="h-2 w-2 shrink-0 rounded-full bg-white/25" />
            <p className="min-w-0 flex-1 truncate font-mono text-[13px] text-white/80">
              {url.slice(0, shownTyped)}
              {playing && shownStep === TYPING && (
                <span className="ml-px inline-block h-3.5 w-px translate-y-0.5 animate-pulse bg-white/80" />
              )}
            </p>
            <CornerDownLeft
              className={cn(
                "h-3.5 w-3.5 shrink-0 transition-colors duration-300",
                shownTyped >= url.length ? "text-white/60" : "text-white/20",
              )}
            />
          </div>

          {/* reading indicator (transient) */}
          <AnimatePresence>
            {playing && shownStep === READING && (
              <motion.p
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.25, ease: EASE_OUT }}
                className="flex items-center gap-2 px-1 text-xs text-white/50"
              >
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                {t("reading")}
              </motion.p>
            )}
          </AnimatePresence>

          {/* extracted product */}
          {shownStep >= PATTERN && (
            <motion.div
              initial={playing ? { opacity: 0, y: 10 } : false}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, ease: EASE_OUT }}
              className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-xl border border-white/10 bg-white/[0.05] p-3"
            >
              <span
                className="h-10 w-10 shrink-0 rounded-lg"
                style={{ background: THUMB_ART[0] }}
              />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13px] font-semibold text-white/90">
                  {t("productName")}
                </span>
                <span className="block truncate text-xs text-white/45">
                  {t("productMeta")}
                </span>
              </span>
              <motion.span
                initial={playing ? { opacity: 0 } : false}
                animate={{ opacity: 1 }}
                transition={{ delay: playing ? 0.55 : 0, duration: 0.35 }}
                className="ml-auto flex min-w-0 max-w-full items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.06] px-2.5 py-1 text-[11px] font-medium text-white/70"
              >
                <Sparkles className="h-3 w-3 shrink-0 text-brand-300" />
                <span className="truncate">{t("pattern")}</span>
              </motion.span>
            </motion.div>
          )}

          {/* storyboard */}
          {shownStep >= BEATS && (
            <div className="space-y-2">
              {BEAT_KEYS.map((key, i) => (
                <motion.div
                  key={key}
                  initial={playing ? { opacity: 0, y: 10 } : false}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    duration: 0.4,
                    ease: EASE_OUT,
                    delay: playing ? i * 0.14 : 0,
                  }}
                  className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.04] p-3"
                >
                  <span
                    className="h-12 w-7 shrink-0 rounded-md"
                    style={{ background: THUMB_ART[i] }}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block text-[13px] font-semibold text-white/90">
                      {t(`beats.${key}.label`)}
                    </span>
                    <span className="block truncate text-xs text-white/45">
                      {t(`beats.${key}.line`)}
                    </span>
                  </span>
                  <span className="relative shrink-0">
                    {approved ? (
                      <motion.span
                        initial={playing ? { opacity: 0, scale: 0.6 } : false}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{
                          duration: 0.22,
                          ease: EASE_OUT,
                          delay: playing ? i * 0.16 : 0,
                        }}
                        className="flex items-center gap-1 rounded-full bg-live/15 px-2.5 py-1 text-[11px] font-semibold text-live"
                      >
                        <Check className="h-3 w-3" />
                        {t("approved")}
                      </motion.span>
                    ) : (
                      <span className="flex items-center rounded-full border border-white/15 px-2.5 py-1 text-[11px] font-medium text-white/70">
                        {t("approve")}
                      </span>
                    )}
                    {/* cursor slides in and clicks the first Approve */}
                    {playing && shownStep === APPROVE && i === 0 && (
                      <motion.span
                        initial={{ opacity: 0, x: 74, y: 48 }}
                        animate={{
                          opacity: [0, 1, 1, 1],
                          x: [74, 10, 10, 10],
                          y: [48, 9, 9, 9],
                          scale: [1, 1, 0.8, 1],
                        }}
                        transition={{
                          duration: 1,
                          times: [0, 0.55, 0.75, 0.9],
                          ease: "easeOut",
                        }}
                        className="pointer-events-none absolute right-0 top-0 z-10"
                      >
                        <MousePointer2
                          className="h-5 w-5 drop-shadow-md"
                          fill="white"
                          stroke="#14171a"
                          strokeWidth={1.5}
                        />
                      </motion.span>
                    )}
                  </span>
                </motion.div>
              ))}
            </div>
          )}

          {/* render progress */}
          <div className="mt-auto pt-1.5">
            <AnimatePresence>
              {playing && shownStep === RENDERING && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <p className="mb-2 flex items-center gap-2 text-xs text-white/55">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    {t("rendering")}
                  </p>
                  <div className="h-1 overflow-hidden rounded-full bg-white/10">
                    <motion.div
                      initial={{ width: "0%" }}
                      animate={{ width: "100%" }}
                      transition={{ duration: 2.25, ease: "easeInOut" }}
                      className="h-full rounded-full bg-brand-400"
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>

        {/* ---------------------------------------------------- the output */}
        <div className="mx-auto w-44 shrink-0 sm:w-52">
          <div className="relative aspect-9/16 overflow-hidden rounded-[1.4rem] border border-white/12 bg-[#0d1013]">
            {video ? (
              <video
                className="absolute inset-0 h-full w-full object-cover"
                src={video.src}
                poster={video.poster}
                muted
                loop
                playsInline
                autoPlay
              />
            ) : (
              <AnimatePresence initial={false}>
                {shownStep === DONE ? (
                  <motion.div
                    key="rendered"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.5, ease: EASE_OUT }}
                    className="absolute inset-0"
                    style={{
                      background:
                        "radial-gradient(130% 90% at 72% 6%, #33545e 0%, #131a1e 58%, #0c0f12 100%)",
                    }}
                  >
                    <div className="absolute -left-10 top-1/4 h-56 w-24 rotate-[24deg] bg-white/[0.05] blur-2xl" />
                  </motion.div>
                ) : (
                  <motion.div
                    key="stage"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.4 }}
                    className="absolute inset-0 bg-[radial-gradient(120%_85%_at_50%_0%,#181d22_0%,#0d1013_70%)]"
                  />
                )}
              </AnimatePresence>
            )}

            {/* rendered overlay */}
            {shownStep === DONE && (
              <>
                <div className="absolute inset-x-0 top-0 flex items-center justify-between p-3">
                  <motion.span
                    initial={playing ? { opacity: 0, scale: 0.6 } : false}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.25, ease: EASE_OUT, delay: playing ? 0.35 : 0 }}
                    className="flex items-center gap-1.5 rounded-full bg-black/45 px-2.5 py-1 text-[10px] font-semibold text-white backdrop-blur-sm"
                  >
                    <span className="h-1.5 w-1.5 rounded-full bg-live" />
                    {t("rendered")}
                  </motion.span>
                  <span className="rounded-full bg-black/45 px-2.5 py-1 text-[10px] font-medium text-white/85 backdrop-blur-sm">
                    {t("duration")}
                  </span>
                </div>
                {!video && (
                  <motion.div
                    initial={playing ? { opacity: 0, y: 12 } : false}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.45, ease: EASE_OUT, delay: playing ? 0.5 : 0 }}
                    className="absolute inset-x-0 bottom-0 space-y-2.5 p-3.5"
                  >
                    <p className="text-center text-[13px] font-bold leading-snug text-white drop-shadow-sm">
                      {t("caption")}
                    </p>
                    <div className="flex items-center justify-center gap-2 rounded-full bg-white/14 px-3 py-1.5 backdrop-blur-sm">
                      <span className="h-4 w-4 rounded bg-white/80" />
                      <span className="text-[11px] font-semibold text-white">
                        {t("shopNow")}
                      </span>
                    </div>
                  </motion.div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function StudioChip({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full border border-white/10 bg-white/[0.05] px-2.5 py-1 text-[11px] font-medium text-white/65">
      {children}
    </span>
  );
}
