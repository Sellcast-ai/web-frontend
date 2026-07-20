import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { PricingClient } from "@/components/marketing/pricing-client";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("marketing.metadata.pricing");
  return { title: t("title"), description: t("description") };
}

export default function PricingPage() {
  return <PricingClient />;
}
