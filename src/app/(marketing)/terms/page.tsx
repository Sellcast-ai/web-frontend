import type { Metadata } from "next";
import { Prose } from "@/components/marketing/page-parts";

export const metadata: Metadata = { title: "Terms of Service" };

export default function TermsPage() {
  return (
    <div className="container-page py-16">
      <div className="mx-auto max-w-3xl">
        <p className="text-xs font-bold uppercase tracking-widest text-brand-600">
          Legal
        </p>
        <h1 className="mt-2 font-display text-4xl font-bold text-ink">
          Terms of Service
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Last updated June 1, 2026
        </p>
      </div>

      <div className="mt-10">
        <Prose>
          <p>
            These Terms govern your use of Lumi, a Sellcast product. By creating
            an account or using the service you agree to these Terms.
          </p>

          <h2>The service</h2>
          <p>
            Lumi turns products into short-form videos using AI. Outputs are
            generated automatically and may vary in quality; you are responsible
            for reviewing them before publishing.
          </p>

          <h2>Your account</h2>
          <p>
            You must provide accurate information and keep your account secure.
            You are responsible for activity under your account.
          </p>

          <h2>Acceptable use</h2>
          <ul>
            <li>Don&apos;t use Lumi for unlawful, deceptive, or infringing content.</li>
            <li>Don&apos;t misrepresent products or make false claims.</li>
            <li>Don&apos;t abuse, reverse-engineer, or overload the service.</li>
            <li>Follow the rules of any platform where you publish (e.g. TikTok, Reels).</li>
          </ul>

          <h2>Content & ownership</h2>
          <h3>Your content</h3>
          <p>
            You retain rights to the product information and assets you provide.
            You grant us a license to process them to deliver the service.
          </p>
          <h3>Generated output</h3>
          <p>
            Subject to these Terms and your plan, you may use videos you generate
            for your commercial purposes. You are responsible for ensuring your
            use complies with applicable laws and platform policies.
          </p>

          <h2>Subscriptions & billing</h2>
          <p>
            Paid plans are billed in advance on a recurring basis. You can change
            or cancel anytime; see our{" "}
            <a href="/refunds">Refunds policy</a> for details.
          </p>

          <h2>Disclaimers</h2>
          <p>
            Lumi is provided &ldquo;as is.&rdquo; We don&apos;t guarantee that
            generated videos will achieve any particular performance or comply
            with every platform&apos;s evolving rules.
          </p>

          <h2>Limitation of liability</h2>
          <p>
            To the extent permitted by law, Sellcast is not liable for indirect or
            consequential damages arising from your use of Lumi.
          </p>

          <h2>Termination</h2>
          <p>
            You may stop using Lumi at any time. We may suspend or terminate
            accounts that violate these Terms.
          </p>

          <h2>Changes</h2>
          <p>
            We may update these Terms; material changes will be reflected by the
            date above and continued use constitutes acceptance.
          </p>

          <h2>Contact</h2>
          <p>
            Questions? Email <a href="mailto:legal@sellcast.ai">legal@sellcast.ai</a>.
          </p>
        </Prose>
      </div>
    </div>
  );
}
