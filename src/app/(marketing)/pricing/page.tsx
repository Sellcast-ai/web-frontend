import type { Metadata } from "next";
import { PricingClient } from "@/components/marketing/pricing-client";

export const metadata: Metadata = {
  title: "Pricing",
  description:
    "Start free, scale when it's working. Lumi pricing — Starter (free), Pro, and Studio. No credit card to begin; annual billing saves ~20%.",
};

export default function PricingPage() {
  return <PricingClient />;
}
