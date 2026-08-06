/**
 * The Shopify OAuth handshake stores a real token, but nothing in the backend
 * imports a catalog from it yet - so this surface must never render as though
 * connecting starts an import. Renders the real page through the real `en`
 * catalog (a missing/typo'd key throws in next-intl) and asserts the honest
 * copy is present, everywhere a merchant would land on it.
 */
import { describe, expect, it, vi } from "vitest";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { NextIntlClientProvider } from "next-intl";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import en from "../../../../messages/en.json";
import { qk } from "@/lib/api/hooks";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

function render(qc: QueryClient, node: React.ReactNode): string {
  return renderToStaticMarkup(
    <NextIntlClientProvider locale="en" messages={en as Record<string, unknown>}>
      <QueryClientProvider client={qc}>{node}</QueryClientProvider>
    </NextIntlClientProvider>,
  );
}

function makeClient(available: boolean) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } });
  qc.setQueryData(qk.shopifyAvailability, { available });
  return qc;
}

describe("Connections page states its honest scope", () => {
  it("never claims connecting imports products, in the subtitle or the persistent notice", async () => {
    const { default: ConnectionsPage } = await import("./page");
    const html = render(makeClient(true), React.createElement(ConnectionsPage));
    const text = html.replace(/<[^>]+>/g, " ");

    // The old subtitle promised "so Lumi can pull in your products" - that
    // claim is gone.
    expect(text).not.toMatch(/pull in your products/i);
    expect(text).toContain("Authorize Lumi to access your shop.");

    // The persistent notice under "Connect a store" is not gated on the
    // availability probe or on ever having connected - it is always on the
    // page, unlike the one-time post-OAuth banner.
    expect(text).toContain("Connecting authorizes Lumi to access your store");
    expect(text).toContain("it doesn’t import products automatically yet");
    expect(text).toContain("Import your catalog from the Products page");
    expect(html).toContain('href="/app/products/new"');
  });

  it("shows the notice even when the Shopify probe reports unavailable", async () => {
    const { default: ConnectionsPage } = await import("./page");
    const html = render(makeClient(false), React.createElement(ConnectionsPage));
    const text = html.replace(/<[^>]+>/g, " ");

    expect(text).toContain("Connecting authorizes Lumi to access your store");
    expect(text).toContain("Shopify connection isn’t available right now");
  });

  it("keeps the connectNotice link reachable without a mouse (a real link, not a disabled-control tooltip)", async () => {
    const { default: ConnectionsPage } = await import("./page");
    const html = render(makeClient(true), React.createElement(ConnectionsPage));

    expect(html).not.toContain("title=\"Connecting authorizes");
    expect(html).toMatch(/<a[^>]+href="\/app\/products\/new"[^>]*>Import your catalog/);
  });
});

describe("en catalog carries the honest connections copy", () => {
  it("has connectNotice with the Products-page link tag and the shop placeholder in connectedBanner", () => {
    expect(en.app.connections.connectNotice).toContain("<link>");
    expect(en.app.connections.connectNotice).toContain("</link>");
    expect(en.app.connections.connectNotice).toMatch(/doesn.t import products automatically yet/);
    expect(en.app.connections.connectedBanner).toContain("{shop}");
    expect(en.app.connections.connectedBanner).toMatch(/import isn.t live yet/);
  });
});
