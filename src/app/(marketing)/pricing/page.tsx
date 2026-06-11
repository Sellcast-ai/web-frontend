import type { Metadata } from "next";
import { PricingClient } from "@/components/marketing/pricing-client";

export const metadata: Metadata = {
  title: "Pricing",
  description:
    "Start free, scale when it's working. Lumi pricing is credit-based — 1 credit = 1 second of video. Free (first video), Creator, Pro, Scale, and Enterprise. No credit card to begin; annual saves ~20%.",
};

export default function PricingPage() {
  return <PricingClient />;
}
