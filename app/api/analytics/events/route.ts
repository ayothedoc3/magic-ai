import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { trackInternalAnalyticsEvent } from "@/lib/analytics.server";

export const runtime = "nodejs";

function safeString(value: unknown, maxLength: number) {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, maxLength) : undefined;
}

function parseIpAddress(request: NextRequest) {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    const first = forwardedFor.split(",")[0]?.trim();
    if (first) return first;
  }

  return request.headers.get("x-real-ip");
}

function normalizeParams(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return undefined;
  }

  return value as Record<string, string | number | boolean | null | undefined>;
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

  const eventName = safeString(body.eventName, 100);
  const eventType =
    body.eventType === "page_view" ? "page_view" : ("event" as const);

  if (!eventName) {
    return NextResponse.json(
      { ok: false, error: "eventName is required" },
      { status: 400 }
    );
  }

  let userId: string | null = null;
  try {
    const session = await auth();
    userId = session?.user?.id ?? null;
  } catch {
    userId = null;
  }

  const tracked = await trackInternalAnalyticsEvent({
    eventName,
    eventType,
    source: "client",
    userId,
    visitorId: safeString(body.visitorId, 150) ?? null,
    sessionId: safeString(body.sessionId, 150) ?? null,
    path: safeString(body.path, 500) ?? null,
    url: safeString(body.url, 1500) ?? null,
    referrer: safeString(body.referrer, 1500) ?? null,
    userAgent: request.headers.get("user-agent"),
    ipAddress: parseIpAddress(request),
    params: normalizeParams(body.params),
  });

  return NextResponse.json({ ok: tracked }, { status: tracked ? 202 : 500 });
}

