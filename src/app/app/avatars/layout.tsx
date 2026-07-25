import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("app.avatars");
  return { title: t("title") };
}

export default function AvatarsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
