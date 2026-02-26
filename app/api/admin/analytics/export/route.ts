import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const RANGE_OPTIONS = {
  "24h": 24 * 60 * 60 * 1000,
  "7d": 7 * 24 * 60 * 60 * 1000,
  "30d": 30 * 24 * 60 * 60 * 1000,
} as const;

type RangeKey = keyof typeof RANGE_OPTIONS;
type ExportType = "events" | "pageviews" | "funnel";

function getRangeKey(value: string | null): RangeKey {
  if (value === "24h" || value === "7d" || value === "30d") return value;
  return "7d";
}

function getExportType(value: string | null): ExportType {
  if (value === "pageviews" || value === "funnel") return value;
  return "events";
}

function parsePositiveInt(value: string | null, fallback: number, max: number) {
  if (!value) return fallback;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.min(parsed, max);
}

function toCount(value: bigint | number | null | undefined) {
  if (typeof value === "bigint") return Number(value);
  if (typeof value === "number") return value;
  return 0;
}

function csvEscape(value: unknown) {
  if (value == null) return "";

  let stringValue: string;
  if (value instanceof Date) {
    stringValue = value.toISOString();
  } else if (typeof value === "object") {
    try {
      stringValue = JSON.stringify(value);
    } catch {
      stringValue = String(value);
    }
  } else {
    stringValue = String(value);
  }

  if (/[",\r\n]/.test(stringValue)) {
    return `"${stringValue.replace(/"/g, "\"\"")}"`;
  }

  return stringValue;
}

function toCsv(rows: Array<Record<string, unknown>>) {
  if (rows.length === 0) {
    return "no_data\n";
  }

  const headers = Object.keys(rows[0]);
  const lines = [
    headers.map((header) => csvEscape(header)).join(","),
    ...rows.map((row) => headers.map((header) => csvEscape(row[header])).join(",")),
  ];

  return `\uFEFF${lines.join("\n")}\n`;
}

function contentDispositionFilename(type: ExportType, range: RangeKey) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  return `analytics-${type}-${range}-${timestamp}.csv`;
}

function percent(numerator: number, denominator: number) {
  if (denominator <= 0) return 0;
  return Number(((numerator / denominator) * 100).toFixed(2));
}

async function requireAdminApiSession() {
  const session = await auth();

  if (!session?.user) {
    return { ok: false as const, status: 401, error: "Unauthorized" };
  }

  if (session.user.role !== "ADMIN") {
    return { ok: false as const, status: 403, error: "Forbidden" };
  }

  return { ok: true as const, session };
}

export async function GET(request: NextRequest) {
  const authResult = await requireAdminApiSession();
  if (!authResult.ok) {
    return Response.json(
      { ok: false, error: authResult.error },
      { status: authResult.status }
    );
  }

  const type = getExportType(request.nextUrl.searchParams.get("type"));
  const range = getRangeKey(request.nextUrl.searchParams.get("range"));
  const limit = parsePositiveInt(
    request.nextUrl.searchParams.get("limit"),
    type === "events" ? 2000 : 500,
    type === "events" ? 10000 : 5000
  );

  const rangeStart = new Date(Date.now() - RANGE_OPTIONS[range]);

  let rows: Array<Record<string, unknown>> = [];

  if (type === "events") {
    const events = await prisma.analyticsEvent.findMany({
      where: { createdAt: { gte: rangeStart } },
      orderBy: { createdAt: "desc" },
      take: limit,
      select: {
        createdAt: true,
        eventName: true,
        eventType: true,
        source: true,
        userId: true,
        teamId: true,
        visitorId: true,
        sessionId: true,
        path: true,
        url: true,
        referrer: true,
        params: true,
      },
    });

    rows = events.map((event) => ({
      created_at: event.createdAt.toISOString(),
      event_name: event.eventName,
      event_type: event.eventType,
      source: event.source,
      user_id: event.userId,
      team_id: event.teamId,
      visitor_id: event.visitorId,
      session_id: event.sessionId,
      path: event.path,
      url: event.url,
      referrer: event.referrer,
      params_json: event.params ? JSON.stringify(event.params) : "",
    }));
  }

  if (type === "pageviews") {
    const pageviewRows = await prisma.$queryRaw<
      {
        path: string | null;
        pageViews: bigint | number;
        uniqueVisitors: bigint | number;
        uniqueSessions: bigint | number;
        lastSeenAt: Date | null;
      }[]
    >`
      SELECT
        "path",
        COUNT(*) AS "pageViews",
        COUNT(DISTINCT "visitorId") FILTER (WHERE "visitorId" IS NOT NULL) AS "uniqueVisitors",
        COUNT(DISTINCT "sessionId") FILTER (WHERE "sessionId" IS NOT NULL) AS "uniqueSessions",
        MAX("createdAt") AS "lastSeenAt"
      FROM "AnalyticsEvent"
      WHERE "createdAt" >= ${rangeStart}
        AND "eventType" = 'page_view'
      GROUP BY "path"
      ORDER BY COUNT(*) DESC
      LIMIT ${limit}
    `;

    rows = pageviewRows.map((row) => ({
      path: row.path ?? "(unknown)",
      page_views: toCount(row.pageViews),
      unique_visitors: toCount(row.uniqueVisitors),
      unique_sessions: toCount(row.uniqueSessions),
      avg_views_per_visitor:
        toCount(row.uniqueVisitors) > 0
          ? Number((toCount(row.pageViews) / toCount(row.uniqueVisitors)).toFixed(2))
          : 0,
      last_seen_at:
        row.lastSeenAt instanceof Date
          ? row.lastSeenAt.toISOString()
          : row.lastSeenAt
            ? new Date(row.lastSeenAt).toISOString()
            : "",
    }));
  }

  if (type === "funnel") {
    const funnelEventNames = [
      "page_view",
      "landing_cta_click",
      "register_submit_attempt",
      "sign_up",
      "login",
    ] as const;

    const counts = await prisma.analyticsEvent.groupBy({
      by: ["eventName"],
      where: {
        createdAt: { gte: rangeStart },
        eventName: { in: [...funnelEventNames] },
      },
      _count: { eventName: true },
    });

    const countMap = new Map(
      counts.map((row) => [row.eventName, row._count.eventName])
    );

    const steps = [
      { step_order: 1, label: "Page Views", event_name: "page_view" },
      {
        step_order: 2,
        label: "Landing CTA Clicks",
        event_name: "landing_cta_click",
      },
      {
        step_order: 3,
        label: "Register Attempts",
        event_name: "register_submit_attempt",
      },
      { step_order: 4, label: "Sign Ups", event_name: "sign_up" },
      { step_order: 5, label: "Successful Logins", event_name: "login" },
    ].map((step) => ({
      ...step,
      count: countMap.get(step.event_name) ?? 0,
    }));

    const base = Math.max(steps[0]?.count ?? 0, 1);

    rows = steps.map((step, index) => {
      const previousCount = index > 0 ? steps[index - 1].count : step.count;
      return {
        step_order: step.step_order,
        step_label: step.label,
        event_name: step.event_name,
        count: step.count,
        pct_of_page_views: percent(step.count, base),
        pct_of_previous_step: percent(step.count, Math.max(previousCount, 1)),
        range_start_utc: rangeStart.toISOString(),
        exported_at_utc: new Date().toISOString(),
      };
    });
  }

  const csv = toCsv(rows);

  return new Response(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${contentDispositionFilename(
        type,
        range
      )}"`,
      "Cache-Control": "no-store",
    },
  });
}

