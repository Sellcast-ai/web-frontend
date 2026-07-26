import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  // /app/marketplace was the old post-login landing route; keep bookmarks and
  // history working while the surface is hidden. Drop this when it comes back.
  async redirects() {
    return [
      {
        source: "/app/marketplace/:path*",
        destination: "/app/products",
        permanent: false,
      },
    ];
  },
};

export default withNextIntl(nextConfig);
