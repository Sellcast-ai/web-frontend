import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { PricingClient } from "@/components/marketing/pricing-client";
import { hasSession } from "@/lib/auth-redirect";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("marketing.metadata.pricing");
  return { title: t("title"), description: t("description") };
}

export default async function PricingPage() {
  return <PricingClient signedIn={await hasSession()} />;
}
