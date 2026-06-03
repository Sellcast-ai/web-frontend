import { Check, Play, Sparkles, TrendingUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";

/**
 * Pure CSS/markup hero visual — a stylized "studio" showing the
 * product → beats → rendered video pipeline. No external images.
 */
export function HeroMock() {
  return (
    <div className="relative mx-auto w-full max-w-[460px]">
      {/* glow wash */}
      <div className="bg-aurora absolute -inset-10 -z-10 animate-glow blur-2xl" />

      {/* phone / video frame */}
      <div className="relative mx-auto aspect-9/16 w-[clamp(220px,72%,300px)] overflow-hidden rounded-[2.2rem] border border-white/70 bg-ink shadow-card">
        {/* video content */}
        <div className="bg-hero absolute inset-0 opacity-95" />
        <div className="bg-aurora absolute inset-0 opacity-60 mix-blend-overlay" />

        {/* top status row */}
        <div className="absolute inset-x-0 top-0 flex items-center justify-between p-4">
          <Badge variant="glass" size="sm" className="text-white/90">
            <span className="h-1.5 w-1.5 rounded-full bg-rose" /> 9:16
          </Badge>
          <Badge variant="glass" size="sm" className="text-white/90">
            00:18
          </Badge>
        </div>

        {/* play */}
        <div className="absolute left-1/2 top-1/2 flex h-16 w-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full glass shadow-glow">
          <Play className="ml-0.5 h-6 w-6 fill-white text-white" />
        </div>

        {/* caption + cta */}
        <div className="absolute inset-x-0 bottom-0 space-y-2 p-4">
          <p className="text-center text-[15px] font-extrabold leading-tight text-white drop-shadow">
            this $24 gadget sold out{" "}
            <span className="rounded bg-white/25 px-1">3 times</span> 👀
          </p>
          <div className="flex items-center justify-center gap-2 rounded-full glass px-3 py-2">
            <span className="h-6 w-6 rounded-md bg-white/80" />
            <span className="text-xs font-semibold text-white">
              Shop now · $23.99
            </span>
          </div>
        </div>
      </div>

      {/* floating: product source */}
      <div className="absolute -left-2 top-10 w-44 animate-float rounded-2xl border border-border bg-card p-3 shadow-card sm:-left-6">
        <div className="flex items-center gap-2">
          <div className="h-10 w-10 rounded-xl bg-brand-gradient" />
          <div className="min-w-0">
            <p className="truncate text-xs font-semibold text-ink">
              Mini Massage Gun
            </p>
            <p className="text-[11px] text-muted-foreground">$23.99 · 30% comm.</p>
          </div>
        </div>
        <div className="mt-2 flex items-center gap-1 text-[11px] font-semibold text-success">
          <TrendingUp className="h-3.5 w-3.5" /> 12.4k sold / mo
        </div>
      </div>

      {/* floating: beat review */}
      <div className="absolute -right-2 top-28 w-48 animate-float-slow rounded-2xl border border-border bg-card p-3 shadow-card sm:-right-6">
        <p className="mb-2 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-brand-700">
          <Sparkles className="h-3.5 w-3.5" /> Beat review
        </p>
        <div className="space-y-1.5">
          {["Hook", "Proof", "Offer"].map((b, i) => (
            <div
              key={b}
              className="flex items-center justify-between rounded-lg bg-muted px-2 py-1.5"
            >
              <span className="text-xs font-medium text-ink">{b}</span>
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-success">
                <Check className="h-3 w-3" />
                {i === 2 ? "auto" : "ok"}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* floating: model chip */}
      <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 animate-float rounded-full border border-border bg-card px-4 py-2 shadow-card">
        <p className="whitespace-nowrap text-xs font-semibold text-ink">
          Rendered with{" "}
          <span className="text-brand font-bold">Seedance 2.0</span>
        </p>
      </div>
    </div>
  );
}
