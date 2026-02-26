import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    process.env.NEXTAUTH_URL?.trim() ||
    "http://localhost:3000";

  return {
    rules: [
      {
        userAgent: "*",
        allow: [
          "/",
          "/ai-templates/",
          "/ai-tools/",
          "/ai-generated-examples/",
          "/best-ai-for-",
          "/dall-e-prompts-for-",
        ],
        disallow: ["/api/", "/admin/", "/dashboard/", "/agents/"],
      },
    ],
    sitemap: [`${baseUrl.replace(/\/$/, "")}/sitemap.xml`],
    host: baseUrl.replace(/\/$/, ""),
  };
}

