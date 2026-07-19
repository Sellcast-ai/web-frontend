"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";
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
  const t = useTranslations("shared.error");

  useEffect(() => {
    // hook a real error reporter (e.g. Sentry) here in production
    console.error(error);
  }, [error]);

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center px-6 text-center">
      <div className="bg-aurora absolute inset-0 -z-10 opacity-40" />
      <Logo href="/" />
      <h1 className="mt-10 font-display text-3xl font-bold text-ink">
        {t("title")}
      </h1>
      <p className="mt-2 max-w-sm text-muted-foreground">
        {t("description")}
      </p>
      <div className="mt-7 flex gap-3">
        <Button size="lg" onClick={() => reset()}>
          <RotateCcw className="h-4 w-4" />
          {t("tryAgain")}
        </Button>
        <Button href="/" variant="outline" size="lg">
          {t("backHome")}
        </Button>
      </div>
    </div>
  );
}
