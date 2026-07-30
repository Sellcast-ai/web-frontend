import { MarketingSessionProvider } from "@/components/marketing/auth-cta";
import { SiteHeader } from "@/components/marketing/site-header";
import { SiteFooter } from "@/components/marketing/site-footer";
import { hasSession } from "@/lib/auth-redirect";

export default async function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <MarketingSessionProvider signedIn={await hasSession()}>
      <div className="marketing flex min-h-screen flex-col">
        <SiteHeader />
        <main className="flex-1">{children}</main>
        <SiteFooter />
      </div>
    </MarketingSessionProvider>
  );
}
