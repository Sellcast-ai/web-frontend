import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/app/app-shell";
import { COOKIE } from "@/lib/api/config";

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
