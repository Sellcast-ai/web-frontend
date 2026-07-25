import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("app.products");
  return { title: t("title") };
}

export default function ProductsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
