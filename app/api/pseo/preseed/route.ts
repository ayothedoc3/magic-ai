import { NextRequest, NextResponse } from "next/server";
import { preseedPseoPages } from "@/lib/pseo/service";

export const runtime = "nodejs";

function isAuthorized(request: NextRequest) {
  const configured = process.env.PSEO_CRON_SECRET?.trim();
  if (!configured) {
    return { ok: false as const, status: 500, reason: "PSEO_CRON_SECRET is not configured" };
  }

  const authHeader = request.headers.get("authorization");
  const bearer =
    authHeader?.startsWith("Bearer ") ? authHeader.slice("Bearer ".length) : null;
  const headerSecret = request.headers.get("x-cron-secret");
  const candidate = bearer ?? headerSecret;

  if (!candidate || candidate !== configured) {
    return { ok: false as const, status: 401, reason: "Unauthorized" };
  }

  return { ok: true as const };
}

function parsePositiveInt(value: string | null, fallback: number, max = 1000) {
  if (!value) return fallback;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.min(parsed, max);
}

export async function POST(request: NextRequest) {
  const auth = isAuthorized(request);
  if (!auth.ok) {
    return NextResponse.json(
      { ok: false, error: auth.reason },
      { status: auth.status }
    );
  }

  const templateLimit = parsePositiveInt(
    request.nextUrl.searchParams.get("limit"),
    500,
    2000
  );
  const publish = request.nextUrl.searchParams.get("publish") !== "false";

  const result = await preseedPseoPages({
    templateLimit,
    publish,
  });

  return NextResponse.json({
    ok: true,
    templateLimit,
    publish,
    result,
    timestamp: new Date().toISOString(),
  });
}

