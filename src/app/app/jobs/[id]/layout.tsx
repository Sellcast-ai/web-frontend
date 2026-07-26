import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("app.jobs");
  return { title: t("videoFallback") };
}

export default function JobDetailLayout({ children }: { children: React.ReactNode }) {
  return children;
}
