import type { Metadata } from "next";
import { Prose } from "@/components/marketing/page-parts";

export const metadata: Metadata = { title: "Privacy Policy" };

export default function PrivacyPage() {
  return (
    <div className="container-page py-16">
      <div className="mx-auto max-w-3xl">
        <p className="text-xs font-bold uppercase tracking-widest text-brand-600">
          Legal
        </p>
        <h1 className="mt-2 font-display text-4xl font-bold text-ink">
          Privacy Policy
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Last updated June 1, 2026
        </p>
      </div>

      <div className="mt-10">
        <Prose>
          <p>
            This Privacy Policy explains how Lumi, a Sellcast product
            (&ldquo;Lumi&rdquo;, &ldquo;we&rdquo;), collects, uses, and protects
            your information when you use our website and application. By using
            Lumi you agree to the practices described here.
          </p>

          <h2>Information we collect</h2>
          <ul>
            <li>
              <strong>Account data</strong> — your phone number, and (if
              provided) display name, email, and connected sign-in providers.
            </li>
            <li>
              <strong>Usage data</strong> — products you browse or save, videos
              you generate, and the choices you make in the studio.
            </li>
            <li>
              <strong>Technical data</strong> — device, browser, IP address, and
              session information used to keep you signed in and secure.
            </li>
          </ul>

          <h2>How we use your information</h2>
          <ul>
            <li>To provide, operate, and improve the Lumi service.</li>
            <li>To generate the videos you request and show your history.</li>
            <li>To authenticate you and protect against abuse.</li>
            <li>To communicate service updates and respond to support.</li>
          </ul>

          <h2>Sharing</h2>
          <p>
            We do not sell your personal information. We share data only with
            service providers that help us operate Lumi (for example, video and
            speech model providers, cloud storage, and SMS delivery), and only as
            needed to provide the service or comply with law.
          </p>

          <h2>Cookies & sessions</h2>
          <p>
            We use first-party cookies to keep you signed in and remember your
            theme preference. We do not use them for cross-site advertising.
          </p>

          <h2>Data retention</h2>
          <p>
            We retain account and content data for as long as your account is
            active. You can delete your videos at any time, and you may request
            deletion of your account and associated data.
          </p>

          <h2>Your rights</h2>
          <p>
            Depending on your region, you may have rights to access, correct,
            export, or delete your personal data. Contact us to exercise them.
          </p>

          <h2>Security</h2>
          <p>
            We use industry-standard measures to protect your data, including
            encrypted transport and hashed credentials. No method of transmission
            is perfectly secure, but we work to safeguard your information.
          </p>

          <h2>Children</h2>
          <p>
            Lumi is not directed to children under 13 (or the minimum age in your
            jurisdiction), and we do not knowingly collect their data.
          </p>

          <h2>Changes</h2>
          <p>
            We may update this policy from time to time. Material changes will be
            noted by updating the date above.
          </p>

          <h2>Contact</h2>
          <p>
            Questions? Email <a href="mailto:privacy@sellcast.ai">privacy@sellcast.ai</a>.
          </p>
        </Prose>
      </div>
    </div>
  );
}
