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
  // Files under /public default to `max-age=0`, which forces a revalidation the
  // media element can't satisfy from cache: the showcase player warms metadata
  // and then plays, and each showcase clip was being downloaded twice per visit
  // as a result. A day of freshness collapses that back to one fetch and makes
  // repeat visits free. The filenames are unversioned, so nothing longer than a
  // day belongs here: a swapped clip - the realistic reason being a brand or
  // legal pull - has to propagate within 24h, and `stale-while-revalidate`
  // would have kept the pulled bytes playing well past that.
  async headers() {
    return [
      {
        source: "/marketing/videos/:file*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=86400",
          },
        ],
      },
    ];
  },
};

export default withNextIntl(nextConfig);
