import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("app.videos");
  return { title: t("title") };
}

export default function VideosLayout({ children }: { children: React.ReactNode }) {
  return children;
}
