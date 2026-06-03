import type { Metadata } from "next";
import { Rocket } from "lucide-react";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Careers" };

export default function CareersPage() {
  return (
    <div className="container-page flex min-h-[60vh] flex-col items-center justify-center py-20 text-center">
      <div className="bg-aurora absolute inset-x-0 top-16 -z-10 h-64 opacity-50" />
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-gradient text-white shadow-glow">
        <Rocket className="h-8 w-8" />
      </div>
      <h1 className="mt-6 font-display text-4xl font-bold text-ink">
        We&apos;re building the future of commerce video
      </h1>
      <p className="mt-3 max-w-md text-muted-foreground">
        We&apos;re a small team moving fast. No open roles posted yet — but if
        you&apos;re exceptional at AI, video, or growth, we&apos;d love to hear
        from you.
      </p>
      <div className="mt-7">
        <Button href="mailto:careers@sellcast.ai" size="lg">
          Introduce yourself
        </Button>
      </div>
    </div>
  );
}
