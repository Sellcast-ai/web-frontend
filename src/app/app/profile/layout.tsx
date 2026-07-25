import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("app.profile");
  return { title: t("title") };
}

export default function ProfileLayout({ children }: { children: React.ReactNode }) {
  return children;
}
