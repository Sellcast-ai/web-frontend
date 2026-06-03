import type { Metadata } from "next";
import { Prose } from "@/components/marketing/page-parts";

export const metadata: Metadata = { title: "Payments & Refunds" };

export default function RefundsPage() {
  return (
    <div className="container-page py-16">
      <div className="mx-auto max-w-3xl">
        <p className="text-xs font-bold uppercase tracking-widest text-brand-600">
          Legal
        </p>
        <h1 className="mt-2 font-display text-4xl font-bold text-ink">
          Payments &amp; Refunds
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Last updated June 1, 2026
        </p>
      </div>

      <div className="mt-10">
        <Prose>
          <p>
            We want you to be happy with Lumi. This policy explains how billing
            and refunds work.
          </p>

          <h2>Free plan</h2>
          <p>
            The Starter plan is free with no time limit. You can explore Lumi and
            generate your first videos before paying anything.
          </p>

          <h2>Subscriptions</h2>
          <p>
            Paid plans are billed in advance — monthly or annually. You keep
            access through the end of the period you&apos;ve paid for.
          </p>

          <h2>7-day money-back guarantee</h2>
          <p>
            If you&apos;re not satisfied within 7 days of your first paid charge,
            email us and we&apos;ll refund that charge in full.
          </p>

          <h2>Annual plans</h2>
          <p>
            Annual plans can be refunded on a pro-rated basis within the first 30
            days. After that, you keep access until the term ends.
          </p>

          <h2>Cancellations</h2>
          <p>
            Cancel anytime from your account. Cancellation stops future billing;
            it doesn&apos;t retroactively refund the current period (except under
            the guarantee above).
          </p>

          <h2>How to request a refund</h2>
          <p>
            Email <a href="mailto:billing@sellcast.ai">billing@sellcast.ai</a>{" "}
            from your account email with your account details. We typically
            respond within two business days.
          </p>
        </Prose>
      </div>
    </div>
  );
}
