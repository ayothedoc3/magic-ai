import { NextRequest, NextResponse } from "next/server";
import { GeneratedPageType } from "@prisma/client";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getPseoPagePath, upsertGeneratedVariantPage } from "@/lib/pseo/service";
import { hashVariantJson, slugify } from "@/lib/pseo/slug-utils";

export const runtime = "nodejs";

function safeString(value: unknown, maxLength = 120) {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, maxLength) : undefined;
}

function safeText(value: unknown, maxLength = 12000) {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, maxLength) : undefined;
}

function parsePageType(value: unknown) {
  if (typeof value !== "string") return GeneratedPageType.GENERATED_EXAMPLE;
  return Object.values(GeneratedPageType).includes(value as GeneratedPageType)
    ? (value as GeneratedPageType)
    : GeneratedPageType.GENERATED_EXAMPLE;
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  let body: Record<string, unknown> = {};
  try {
    if (request.headers.get("content-type")?.includes("application/json")) {
      body = (await request.json()) as Record<string, unknown>;
    }
  } catch {
    body = {};
  }

  const templateId = safeString(body.templateId, 100);
  const pageType = parsePageType(body.pageType);
  const slugOverride = safeString(body.slugOverride, 200);
  const niche = safeString(body.niche, 80);
  const tone = safeString(body.tone, 80);
  const platform = safeString(body.platform, 80);
  const sharedInputText = safeText(body.sharedInputText, 12000);
  const sharedOutputText = safeText(body.sharedOutputText, 24000);
  const sourceSlug = safeString(body.sourceSlug, 200);

  if (!templateId) {
    return NextResponse.json(
      { ok: false, error: "templateId is required" },
      { status: 400 }
    );
  }

  const template = await prisma.template.findUnique({
    where: { id: templateId },
    select: { id: true, slug: true, active: true },
  });

  if (!template?.active) {
    return NextResponse.json({ ok: false, error: "Template not found" }, { status: 404 });
  }

  const variantJson: Record<string, unknown> = {};
  if (niche) variantJson.niche = niche;
  if (tone) variantJson.tone = tone;
  if (platform) variantJson.platform = platform;
  if (sharedInputText) variantJson.sharedInputText = sharedInputText;
  if (sharedOutputText) variantJson.sharedOutputText = sharedOutputText;
  if (sourceSlug) variantJson.sourceSlug = sourceSlug;
  variantJson.sharedByUserId = session.user.id;

  const needsSpecificShareSlug =
    pageType === GeneratedPageType.GENERATED_EXAMPLE &&
    (!slugOverride || tone || platform || sharedInputText || sharedOutputText);
  const derivedSlugOverride = needsSpecificShareSlug
    ? slugify(
        [
          template.slug,
          "for",
          niche ?? "shared-example",
          tone,
          platform,
          hashVariantJson(variantJson).slice(0, 8),
        ]
          .filter(Boolean)
          .join("-")
      )
    : slugOverride;

  const page = await upsertGeneratedVariantPage({
    templateId: template.id,
    templateSlug: template.slug,
    pageType,
    variantJson,
    slugOverride: derivedSlugOverride,
    published: true,
  });

  return NextResponse.json({
    ok: true,
    page,
    path: getPseoPagePath({ pageType: page.pageType, slug: page.slug }),
  });
}
