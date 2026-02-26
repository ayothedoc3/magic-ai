import { NextRequest, NextResponse } from "next/server";
import { GeneratedPageType } from "@prisma/client";
import { incrementGeneratedPageHit } from "@/lib/pseo/service";

export const runtime = "nodejs";

function safeString(value: unknown, maxLength = 200) {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, maxLength) : undefined;
}

function parseGeneratedPageType(value: unknown) {
  if (typeof value !== "string") return undefined;
  return Object.values(GeneratedPageType).includes(value as GeneratedPageType)
    ? (value as GeneratedPageType)
    : undefined;
}

export async function POST(request: NextRequest) {
  let body: Record<string, unknown> = {};

  try {
    if (request.headers.get("content-type")?.includes("application/json")) {
      body = (await request.json()) as Record<string, unknown>;
    }
  } catch {
    body = {};
  }

  const pageId = safeString(body.pageId, 100);
  const slug = safeString(body.slug, 200);
  const pageType = parseGeneratedPageType(body.pageType);

  if (!pageId && !(slug && pageType)) {
    return NextResponse.json(
      { ok: false, error: "Missing page identifier" },
      { status: 400 }
    );
  }

  try {
    await incrementGeneratedPageHit({ pageId, slug, pageType });
    return NextResponse.json({ ok: true }, { status: 202 });
  } catch {
    return NextResponse.json({ ok: false }, { status: 200 });
  }
}

