"use client";

import { useEffect } from "react";
import { RotateCcw } from "lucide-react";
import { Logo } from "@/components/marketing/logo";
import { Button } from "@/components/ui/button";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // hook a real error reporter (e.g. Sentry) here in production
    console.error(error);
  }, [error]);

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center px-6 text-center">
      <div className="bg-aurora absolute inset-0 -z-10 opacity-40" />
      <Logo href="/" />
      <h1 className="mt-10 font-display text-3xl font-bold text-ink">
        Something went wrong.
      </h1>
      <p className="mt-2 max-w-sm text-muted-foreground">
        That&apos;s on us — try again, and if it keeps happening, come back in a
        bit.
      </p>
      <div className="mt-7 flex gap-3">
        <Button size="lg" onClick={() => reset()}>
          <RotateCcw className="h-4 w-4" />
          Try again
        </Button>
        <Button href="/" variant="outline" size="lg">
          Back home
        </Button>
      </div>
    </div>
  );
}
