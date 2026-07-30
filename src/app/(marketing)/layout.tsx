import { MarketingSessionProvider } from "@/components/marketing/auth-cta";
import { SiteHeader } from "@/components/marketing/site-header";
import { SiteFooter } from "@/components/marketing/site-footer";
import { hasSession } from "@/lib/auth-redirect";

export default async function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const signedIn = await hasSession();

  return (
    <MarketingSessionProvider signedIn={signedIn}>
      <div className="marketing flex min-h-screen flex-col">
        <SiteHeader signedIn={signedIn} />
        <main className="flex-1">{children}</main>
        <SiteFooter signedIn={signedIn} />
      </div>
    </MarketingSessionProvider>
  );
}
