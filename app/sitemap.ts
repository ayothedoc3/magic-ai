import type { MetadataRoute } from "next";
import { shouldNoindexPseoPage } from "@/lib/pseo/seo-policy";
import { listPseoPagesForSitemap } from "@/lib/pseo/service";
import { getPseoAbsoluteUrl } from "@/lib/pseo/render";
import { buildGeneratedPagePath } from "@/lib/pseo/slug-utils";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const pages = await listPseoPagesForSitemap({
    limit: 8000,
    hitThreshold: 0,
  });

  const staticRoutes = [
    "/",
    "/login",
    "/register",
    "/ai-templates",
    "/ai-tools",
    "/ai-generated-examples",
  ];

  const staticEntries: MetadataRoute.Sitemap = staticRoutes.map((path) => ({
    url: getPseoAbsoluteUrl(path),
    lastModified: now,
    changeFrequency: path === "/" ? "daily" : "weekly",
    priority: path === "/" ? 1 : 0.7,
  }));

  const pseoEntries: MetadataRoute.Sitemap = pages
    .filter(
      (page) =>
        !shouldNoindexPseoPage({
          pageType: page.pageType,
          hitCount: page.hitCount,
          createdAt: page.createdAt,
          lastHitAt: page.lastHitAt,
        })
    )
    .map((page) => ({
      url: getPseoAbsoluteUrl(
        buildGeneratedPagePath({ pageType: page.pageType, slug: page.slug })
      ),
      lastModified: page.updatedAt,
      changeFrequency:
        page.hitCount > 20 ? "daily" : page.hitCount > 0 ? "weekly" : "monthly",
      priority:
        page.pageType === "TEMPLATE"
          ? 0.9
          : page.hitCount > 50
            ? 0.8
            : 0.6,
    }));

  return [...staticEntries, ...pseoEntries];
}
