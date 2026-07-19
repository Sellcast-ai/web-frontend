import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { AuthForm } from "@/components/auth/auth-form";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("auth.metadata");
  return { title: t("createAccount") };
}

export default function SignupPage() {
  return <AuthForm mode="signup" />;
}
