import type { MetadataRoute } from "next";

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://lumi.sellcast.ai";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const routes = [
    "",
    "/features",
    "/pricing",
    "/models",
    "/about",
    "/blog",
    "/careers",
    "/privacy",
    "/terms",
    "/refunds",
    "/login",
    "/signup",
  ];
  return routes.map((path) => ({
    url: `${SITE}${path}`,
    lastModified: now,
    changeFrequency: "weekly",
    priority: path === "" ? 1 : 0.7,
  }));
}
