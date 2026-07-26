import { notFound } from "next/navigation";

export default function DisabledMarketplaceRoute() {
  // Marketplace is intentionally out of the launch product for now.
  notFound();
}
