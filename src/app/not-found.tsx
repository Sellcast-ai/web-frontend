import { getTranslations } from "next-intl/server";
import { Logo } from "@/components/marketing/logo";
import { Button } from "@/components/ui/button";

export default async function NotFound() {
  const t = await getTranslations("shared.notFound");

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center px-6 text-center">
      <div className="bg-aurora absolute inset-0 -z-10 opacity-50" />
      <Logo href="/" />
      <p className="mt-10 font-display text-7xl font-bold text-brand-700">404</p>
      <h1 className="mt-3 font-display text-2xl font-bold text-ink">
        {t("title")}
      </h1>
      <p className="mt-2 max-w-sm text-muted-foreground">
        {t("description")}
      </p>
      <div className="mt-7 flex gap-3">
        <Button href="/" size="lg">
          {t("backHome")}
        </Button>
        <Button href="/app/marketplace" variant="outline" size="lg">
          {t("goToApp")}
        </Button>
      </div>
    </div>
  );
}
