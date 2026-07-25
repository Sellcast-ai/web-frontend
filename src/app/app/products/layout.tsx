import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { TITLE_TEMPLATE } from "../layout";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("app.products");
  return { title: { default: t("title"), template: TITLE_TEMPLATE } };
}

export default function ProductsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
