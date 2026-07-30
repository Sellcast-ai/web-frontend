import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { AuthForm } from "@/components/auth/auth-form";
import { redirectIfAuthenticated } from "@/lib/auth-redirect";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("auth.metadata");
  return { title: t("createAccount") };
}

export default async function SignupPage() {
  await redirectIfAuthenticated();
  return <AuthForm mode="signup" />;
}
