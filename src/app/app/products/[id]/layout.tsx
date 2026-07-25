import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("app.productDetail");
  return { title: `${t("productFallback")} · Lumi Studio` };
}

export default function ProductDetailLayout({ children }: { children: React.ReactNode }) {
  return children;
}
