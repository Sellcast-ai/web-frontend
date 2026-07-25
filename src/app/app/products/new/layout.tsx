import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("app.productsNew");
  return { title: `${t("startTitle")} · Lumi Studio` };
}

export default function NewProductLayout({ children }: { children: React.ReactNode }) {
  return children;
}
