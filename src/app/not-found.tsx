import { Logo } from "@/components/marketing/logo";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center px-6 text-center">
      <div className="bg-aurora absolute inset-0 -z-10 opacity-50" />
      <Logo href="/" />
      <p className="mt-10 font-display text-7xl font-bold text-brand">404</p>
      <h1 className="mt-3 font-display text-2xl font-bold text-ink">
        This page wandered off.
      </h1>
      <p className="mt-2 max-w-sm text-muted-foreground">
        The link may be broken or the page may have moved.
      </p>
      <div className="mt-7 flex gap-3">
        <Button href="/" size="lg">
          Back home
        </Button>
        <Button href="/app/marketplace" variant="outline" size="lg">
          Go to app
        </Button>
      </div>
    </div>
  );
}
