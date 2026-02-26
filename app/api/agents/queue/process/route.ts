import { NextRequest, NextResponse } from "next/server";
import {
  getAgentQueueStats,
  getDefaultStaleAfterMs,
  processQueuedAgentRunsBatch,
  recoverStaleRunningAgentRuns,
} from "@/lib/agent-queue";

function parsePositiveInt(value: string | null | undefined, fallback: number) {
  if (!value) return fallback;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function isAuthorized(request: NextRequest) {
  const configured = process.env.AGENT_QUEUE_CRON_SECRET?.trim();
  if (!configured) {
    return { ok: false, reason: "AGENT_QUEUE_CRON_SECRET is not configured" };
  }

  const authHeader = request.headers.get("authorization");
  const bearer =
    authHeader?.startsWith("Bearer ") ? authHeader.slice("Bearer ".length) : null;
  const headerSecret = request.headers.get("x-cron-secret");
  const candidate = bearer ?? headerSecret;

  if (!candidate || candidate !== configured) {
    return { ok: false, reason: "Unauthorized" };
  }

  return { ok: true as const };
}

export async function GET(request: NextRequest) {
  const auth = isAuthorized(request);
  if (!auth.ok) {
    return NextResponse.json(
      { ok: false, error: auth.reason },
      { status: auth.reason === "Unauthorized" ? 401 : 500 }
    );
  }

  const stats = await getAgentQueueStats();
  return NextResponse.json({
    ok: true,
    stats,
    timestamp: new Date().toISOString(),
  });
}

export async function POST(request: NextRequest) {
  const auth = isAuthorized(request);
  if (!auth.ok) {
    return NextResponse.json(
      { ok: false, error: auth.reason },
      { status: auth.reason === "Unauthorized" ? 401 : 500 }
    );
  }

  let body: Record<string, unknown> = {};
  try {
    if (request.headers.get("content-type")?.includes("application/json")) {
      body = (await request.json()) as Record<string, unknown>;
    }
  } catch {
    body = {};
  }

  const search = request.nextUrl.searchParams;
  const limit = parsePositiveInt(
    search.get("limit") ??
      (typeof body.limit === "number" ? String(body.limit) : null),
    5
  );
  const recoverLimit = parsePositiveInt(
    search.get("recoverLimit") ??
      (typeof body.recoverLimit === "number" ? String(body.recoverLimit) : null),
    10
  );
  const staleAfterMs = parsePositiveInt(
    search.get("staleAfterMs") ??
      (typeof body.staleAfterMs === "number" ? String(body.staleAfterMs) : null),
    getDefaultStaleAfterMs()
  );
  const retryOnFailureParam =
    search.get("retryOnFailure") ??
    (typeof body.retryOnFailure === "boolean"
      ? String(body.retryOnFailure)
      : null);
  const retryOnFailure = retryOnFailureParam !== "false";

  const workerId = `cron-${new Date().toISOString()}`;

  const recovered = await recoverStaleRunningAgentRuns({
    staleAfterMs,
    limit: recoverLimit,
  });
  const results = await processQueuedAgentRunsBatch(limit, {
    workerId,
    retryOnFailure,
  });
  const stats = await getAgentQueueStats();

  return NextResponse.json({
    ok: true,
    workerId,
    processed: results.length,
    failed: results.filter((result) => result.status === "FAILED").length,
    requeued: results.filter((result) => result.status === "REQUEUED").length,
    recovered,
    results,
    stats,
    timestamp: new Date().toISOString(),
  });
}
