import Link from "next/link";
import { cn } from "@/lib/utils";

export function Logo({
  className,
  href = "/",
}: {
  className?: string;
  href?: string | null;
}) {
  const content = (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <span className="relative inline-flex h-8 w-8 items-center justify-center">
        <span className="absolute inset-0 rounded-full bg-brand-gradient blur-[6px] opacity-70" />
        <span className="relative inline-flex h-8 w-8 items-center justify-center rounded-full bg-brand-gradient text-white shadow-glow">
          <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
            <circle cx="12" cy="12" r="4.5" fill="currentColor" />
            {Array.from({ length: 8 }).map((_, i) => {
              const a = (i * Math.PI) / 4;
              const x1 = 12 + Math.cos(a) * 7.4;
              const y1 = 12 + Math.sin(a) * 7.4;
              const x2 = 12 + Math.cos(a) * 9.6;
              const y2 = 12 + Math.sin(a) * 9.6;
              return (
                <line
                  key={i}
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  stroke="currentColor"
                  strokeWidth={1.8}
                  strokeLinecap="round"
                />
              );
            })}
          </svg>
        </span>
      </span>
      <span className="font-display text-xl font-semibold tracking-tight text-ink">
        Lumi
      </span>
    </span>
  );

  if (href === null) return content;
  return (
    <Link href={href} aria-label="Lumi home" className="inline-flex">
      {content}
    </Link>
  );
}
