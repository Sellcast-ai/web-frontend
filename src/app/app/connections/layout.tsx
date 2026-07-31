import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { TITLE_TEMPLATE } from "@/lib/metadata";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("app.connections");
  return { title: { default: t("title"), template: TITLE_TEMPLATE } };
}

export default function ConnectionsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
