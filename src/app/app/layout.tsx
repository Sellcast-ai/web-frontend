import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/app/app-shell";
import { COOKIE } from "@/lib/api/config";

export const TITLE_TEMPLATE = "%s · Lumi Studio";

export const metadata: Metadata = {
  title: {
    default: "Studio",
    template: TITLE_TEMPLATE,
  },
};

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const store = await cookies();
  const hasSession = store.get(COOKIE.access) || store.get(COOKIE.refresh);
  if (!hasSession) redirect("/login");

  return <AppShell>{children}</AppShell>;
}
