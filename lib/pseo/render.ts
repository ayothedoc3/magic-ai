import type { Metadata } from "next";
import { APP_NAME } from "@/lib/constants";
import { buildPseoPageContent } from "@/lib/pseo/content";
import { shouldNoindexPseoPage } from "@/lib/pseo/seo-policy";
import type { PseoPageRecord } from "@/lib/pseo/service";
import { getPseoPagePath } from "@/lib/pseo/service";

function getBaseUrl() {
  const configured =
    process.env.NEXT_PUBLIC_APP_URL?.trim() || process.env.NEXTAUTH_URL?.trim();

  if (configured) {
    try {
      return new URL(configured);
    } catch {
      // fall through
    }
  }

  return new URL("http://localhost:3000");
}

export function getPseoAbsoluteUrl(path: string) {
  return new URL(path, getBaseUrl()).toString();
}

export function getPseoRenderData(page: PseoPageRecord) {
  const path = getPseoPagePath(page);
  const absoluteUrl = getPseoAbsoluteUrl(path);
  const content = buildPseoPageContent({
    template: page.template,
    pageType: page.pageType,
    path: absoluteUrl,
    variant:
      page.variantJson && typeof page.variantJson === "object" && !Array.isArray(page.variantJson)
        ? (page.variantJson as Record<string, unknown>)
        : {},
  });

  return {
    path,
    absoluteUrl,
    content,
  };
}

export function buildPseoMetadata(page: PseoPageRecord): Metadata {
  const { path, absoluteUrl, content } = getPseoRenderData(page);
  const noindex = shouldNoindexPseoPage({
    pageType: page.pageType,
    hitCount: page.hitCount,
    createdAt: page.createdAt,
    lastHitAt: page.lastHitAt,
  });
  const ogUrl = new URL("/api/og/pseo", getBaseUrl());
  ogUrl.searchParams.set("title", content.h1);
  ogUrl.searchParams.set("subtitle", `${APP_NAME} - ${page.template.name}`);
  ogUrl.searchParams.set("snippet", content.ogSnippet);

  return {
    title: content.title,
    description: content.description,
    alternates: {
      canonical: absoluteUrl,
    },
    keywords: content.keywords,
    openGraph: {
      type: "article",
      url: absoluteUrl,
      title: content.title,
      description: content.description,
      images: [
        {
          url: ogUrl.toString(),
          width: 1200,
          height: 630,
          alt: content.h1,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: content.title,
      description: content.description,
      images: [ogUrl.toString()],
    },
    robots: {
      index: !noindex,
      follow: true,
    },
    other: {
      "x-pseo-page-type": page.pageType,
      "x-pseo-slug": page.slug,
      "x-pseo-path": path,
      "x-pseo-noindex": noindex ? "1" : "0",
    },
  };
}
