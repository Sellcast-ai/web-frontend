import type { Metadata } from "next";
import { Newspaper } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Button } from "@/components/ui/button";
import { AuthCta } from "@/components/marketing/auth-cta";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("marketing.metadata.blog");
  return { title: t("title") };
}

export default async function BlogPage() {
  const t = await getTranslations("marketing.blog");
  return (
    <div className="container-page flex min-h-[60vh] flex-col items-center justify-center py-20 text-center">
      <div className="bg-aurora absolute inset-x-0 top-16 -z-10 h-64 opacity-50" />
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-gradient text-white shadow-glow">
        <Newspaper className="h-8 w-8" />
      </div>
      <h1 className="mt-6 font-display text-4xl font-bold text-ink">
        {t("title")}
      </h1>
      <p className="mt-3 max-w-md text-muted-foreground">
        {t("body")}
      </p>
      <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
        <AuthCta label={t("startFree")} size="lg" />
        <Button href="/features" variant="outline" size="lg">
          {t("explore")}
        </Button>
      </div>
    </div>
  );
}
