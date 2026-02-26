import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { cn } from "@/lib/utils";
import { formatDateTime, requireAdminSession } from "@/lib/admin";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type SearchParams = Record<string, string | string[] | undefined>;

const RANGE_OPTIONS = [
  { key: "24h", label: "24h", ms: 24 * 60 * 60 * 1000 },
  { key: "7d", label: "7d", ms: 7 * 24 * 60 * 60 * 1000 },
  { key: "30d", label: "30d", ms: 30 * 24 * 60 * 60 * 1000 },
] as const;

type RangeKey = (typeof RANGE_OPTIONS)[number]["key"];

function getRangeOption(value: string | string[] | undefined) {
  const raw = Array.isArray(value) ? value[0] : value;
  return RANGE_OPTIONS.find((option) => option.key === raw) ?? RANGE_OPTIONS[1];
}

function toCount(value: bigint | number | null | undefined) {
  if (typeof value === "bigint") return Number(value);
  if (typeof value === "number") return value;
  return 0;
}

function formatCount(value: number) {
  return value.toLocaleString("en-US");
}

function formatDelta(current: number, previous: number) {
  if (previous <= 0) {
    if (current <= 0) return { label: "No change", tone: "muted" as const };
    return { label: "New activity", tone: "positive" as const };
  }

  const deltaPercent = ((current - previous) / previous) * 100;
  const rounded = Math.round(deltaPercent);

  if (rounded === 0) return { label: "Flat vs prior period", tone: "muted" as const };

  return {
    label: `${rounded > 0 ? "+" : ""}${rounded}% vs prior period`,
    tone: rounded > 0 ? ("positive" as const) : ("negative" as const),
  };
}

function deltaClassName(tone: "positive" | "negative" | "muted") {
  if (tone === "positive") return "text-emerald-600 dark:text-emerald-400";
  if (tone === "negative") return "text-amber-600 dark:text-amber-400";
  return "text-muted-foreground";
}

function truncate(value: string | null | undefined, maxLength = 60) {
  if (!value) return "N/A";
  return value.length > maxLength ? `${value.slice(0, maxLength - 1)}…` : value;
}

function getHostname(referrer: string | null) {
  if (!referrer) return "Direct / Unknown";
  try {
    return new URL(referrer).hostname || referrer;
  } catch {
    return referrer;
  }
}

function getParamsPreview(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return "—";

  const entries = Object.entries(value as Record<string, unknown>)
    .filter(([, entryValue]) =>
      ["string", "number", "boolean"].includes(typeof entryValue)
    )
    .slice(0, 3)
    .map(([key, entryValue]) => `${key}=${String(entryValue)}`);

  return entries.length > 0 ? truncate(entries.join(", "), 96) : "—";
}

function MetricCard({
  title,
  value,
  description,
  delta,
}: {
  title: string;
  value: string;
  description: string;
  delta?: { label: string; tone: "positive" | "negative" | "muted" };
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <p className="text-xs text-muted-foreground">{description}</p>
        {delta ? (
          <p className={cn("mt-1 text-xs", deltaClassName(delta.tone))}>
            {delta.label}
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}

function BarList({
  rows,
  emptyLabel,
  valueLabel,
}: {
  rows: Array<{ key: string; label: string; count: number; muted?: string }>;
  emptyLabel: string;
  valueLabel: string;
}) {
  if (rows.length === 0) {
    return <p className="text-sm text-muted-foreground">{emptyLabel}</p>;
  }

  const max = Math.max(...rows.map((row) => row.count), 1);

  return (
    <div className="space-y-3">
      {rows.map((row) => (
        <div key={row.key} className="space-y-1">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{row.label}</p>
              {row.muted ? (
                <p className="truncate text-xs text-muted-foreground">
                  {row.muted}
                </p>
              ) : null}
            </div>
            <span className="whitespace-nowrap text-xs text-muted-foreground">
              {row.count.toLocaleString()} {valueLabel}
            </span>
          </div>
          <div className="h-2 rounded-full bg-muted">
            <div
              className="h-2 rounded-full bg-primary"
              style={{
                width: `${Math.max(8, Math.round((row.count / max) * 100))}%`,
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

export default async function AdminAnalyticsPage({
  searchParams,
}: {
  searchParams?: SearchParams;
}) {
  await requireAdminSession();

  const range = getRangeOption(searchParams?.range);
  const now = new Date();
  const rangeStart = new Date(now.getTime() - range.ms);
  const previousRangeStart = new Date(rangeStart.getTime() - range.ms);

  const funnelEventNames = [
    "page_view",
    "landing_cta_click",
    "register_submit_attempt",
    "sign_up",
    "login",
  ];

  const [
    totalEvents,
    totalEventsPrevious,
    pageViews,
    pageViewsPrevious,
    customEvents,
    clientEvents,
    serverEvents,
    anonymousClientEvents,
    topPagesRaw,
    topCustomEventsRaw,
    topReferrersRaw,
    funnelCountsRaw,
    recentEvents,
    distinctSummaryRows,
    activityByDayRows,
  ] = await Promise.all([
    prisma.analyticsEvent.count({
      where: { createdAt: { gte: rangeStart } },
    }),
    prisma.analyticsEvent.count({
      where: { createdAt: { gte: previousRangeStart, lt: rangeStart } },
    }),
    prisma.analyticsEvent.count({
      where: { createdAt: { gte: rangeStart }, eventType: "page_view" },
    }),
    prisma.analyticsEvent.count({
      where: {
        createdAt: { gte: previousRangeStart, lt: rangeStart },
        eventType: "page_view",
      },
    }),
    prisma.analyticsEvent.count({
      where: { createdAt: { gte: rangeStart }, eventType: "event" },
    }),
    prisma.analyticsEvent.count({
      where: { createdAt: { gte: rangeStart }, source: "client" },
    }),
    prisma.analyticsEvent.count({
      where: { createdAt: { gte: rangeStart }, source: "server" },
    }),
    prisma.analyticsEvent.count({
      where: {
        createdAt: { gte: rangeStart },
        source: "client",
        userId: null,
      },
    }),
    prisma.analyticsEvent.groupBy({
      by: ["path"],
      where: {
        createdAt: { gte: rangeStart },
        eventType: "page_view",
        path: { not: null },
      },
      _count: { path: true },
      orderBy: { _count: { path: "desc" } },
      take: 8,
    }),
    prisma.analyticsEvent.groupBy({
      by: ["eventName"],
      where: {
        createdAt: { gte: rangeStart },
        eventType: "event",
      },
      _count: { eventName: true },
      orderBy: { _count: { eventName: "desc" } },
      take: 10,
    }),
    prisma.analyticsEvent.groupBy({
      by: ["referrer"],
      where: {
        createdAt: { gte: rangeStart },
        eventType: "page_view",
        referrer: { not: null },
      },
      _count: { referrer: true },
      orderBy: { _count: { referrer: "desc" } },
      take: 8,
    }),
    prisma.analyticsEvent.groupBy({
      by: ["eventName"],
      where: {
        createdAt: { gte: rangeStart },
        eventName: { in: funnelEventNames },
      },
      _count: { eventName: true },
    }),
    prisma.analyticsEvent.findMany({
      where: { createdAt: { gte: rangeStart } },
      orderBy: { createdAt: "desc" },
      take: 25,
      select: {
        id: true,
        eventName: true,
        eventType: true,
        source: true,
        userId: true,
        visitorId: true,
        sessionId: true,
        path: true,
        referrer: true,
        params: true,
        createdAt: true,
      },
    }),
    prisma.$queryRaw<
      {
        uniqueVisitors: bigint | number | null;
        uniqueSessions: bigint | number | null;
        knownUsers: bigint | number | null;
      }[]
    >`
      SELECT
        COUNT(DISTINCT "visitorId") FILTER (WHERE "visitorId" IS NOT NULL) AS "uniqueVisitors",
        COUNT(DISTINCT "sessionId") FILTER (WHERE "sessionId" IS NOT NULL) AS "uniqueSessions",
        COUNT(DISTINCT "userId") FILTER (WHERE "userId" IS NOT NULL) AS "knownUsers"
      FROM "AnalyticsEvent"
      WHERE "createdAt" >= ${rangeStart}
    `,
    prisma.$queryRaw<
      {
        dayBucket: Date;
        totalEvents: bigint | number;
        pageViews: bigint | number;
      }[]
    >`
      SELECT
        DATE_TRUNC('day', "createdAt") AS "dayBucket",
        COUNT(*) AS "totalEvents",
        COUNT(*) FILTER (WHERE "eventType" = 'page_view') AS "pageViews"
      FROM "AnalyticsEvent"
      WHERE "createdAt" >= ${rangeStart}
      GROUP BY 1
      ORDER BY 1 ASC
    `,
  ]);

  const distinctSummary = distinctSummaryRows[0];
  const uniqueVisitors = toCount(distinctSummary?.uniqueVisitors);
  const uniqueSessions = toCount(distinctSummary?.uniqueSessions);
  const knownUsers = toCount(distinctSummary?.knownUsers);

  const funnelCounts = new Map(
    funnelCountsRaw.map((row) => [row.eventName, row._count.eventName])
  );

  const topPages = topPagesRaw.map((row) => ({
    key: row.path ?? "unknown",
    label: row.path ?? "Unknown path",
    count: row._count.path,
  }));

  const topEvents = topCustomEventsRaw.map((row) => ({
    key: row.eventName,
    label: row.eventName,
    count: row._count.eventName,
  }));

  const topReferrers = topReferrersRaw.map((row) => ({
    key: row.referrer ?? "direct",
    label: getHostname(row.referrer),
    muted: row.referrer ? truncate(row.referrer, 80) : "No referrer header",
    count: row._count.referrer,
  }));

  const activityByDay = activityByDayRows.map((row) => ({
    day: row.dayBucket instanceof Date ? row.dayBucket : new Date(row.dayBucket),
    totalEvents: toCount(row.totalEvents),
    pageViews: toCount(row.pageViews),
  }));

  const maxDailyEvents = Math.max(...activityByDay.map((row) => row.totalEvents), 1);

  const pageViewDelta = formatDelta(pageViews, pageViewsPrevious);
  const totalEventDelta = formatDelta(totalEvents, totalEventsPrevious);

  const funnelSteps = [
    { label: "Page Views", eventName: "page_view" },
    { label: "Landing CTA Clicks", eventName: "landing_cta_click" },
    { label: "Register Attempts", eventName: "register_submit_attempt" },
    { label: "Sign Ups", eventName: "sign_up" },
    { label: "Successful Logins", eventName: "login" },
  ].map((step) => ({
    ...step,
    count: funnelCounts.get(step.eventName) ?? 0,
  }));

  const funnelBase = Math.max(funnelSteps[0]?.count ?? 0, 1);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Analytics</h1>
          <p className="text-muted-foreground">
            First-party visitor and event analytics stored in your own database.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {RANGE_OPTIONS.map((option) => {
            const isActive = option.key === range.key;
            return (
              <Link
                key={option.key}
                href={`/admin/analytics?range=${option.key}`}
                className={cn(
                  "rounded-md border px-3 py-2 text-sm",
                  isActive
                    ? "border-primary bg-primary text-primary-foreground"
                    : "hover:bg-muted"
                )}
              >
                {option.label}
              </Link>
            );
          })}
          <Link
            href={`/api/admin/analytics/export?type=events&range=${range.key}`}
            className="rounded-md border px-3 py-2 text-sm hover:bg-muted"
          >
            Export Events CSV
          </Link>
          <Link
            href={`/api/admin/analytics/export?type=pageviews&range=${range.key}`}
            className="rounded-md border px-3 py-2 text-sm hover:bg-muted"
          >
            Export Pageviews CSV
          </Link>
          <Link
            href={`/api/admin/analytics/export?type=funnel&range=${range.key}`}
            className="rounded-md border px-3 py-2 text-sm hover:bg-muted"
          >
            Export Funnel CSV
          </Link>
          <Link
            href="/admin/settings"
            className="rounded-md border px-3 py-2 text-sm hover:bg-muted"
          >
            Env Checklist
          </Link>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          title="Unique Visitors"
          value={formatCount(uniqueVisitors)}
          description={`Distinct visitor IDs in last ${range.label}`}
        />
        <MetricCard
          title="Page Views"
          value={formatCount(pageViews)}
          description={`Tracked page_view events in last ${range.label}`}
          delta={pageViewDelta}
        />
        <MetricCard
          title="Total Events"
          value={formatCount(totalEvents)}
          description={`Client + server analytics events in last ${range.label}`}
          delta={totalEventDelta}
        />
        <MetricCard
          title="Known Users"
          value={formatCount(knownUsers)}
          description={`Distinct authenticated users seen in last ${range.label}`}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Traffic Summary</CardTitle>
            <CardDescription>
              Session coverage and anonymous visitor split
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Unique sessions</span>
              <span className="font-medium">{formatCount(uniqueSessions)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Custom events</span>
              <span className="font-medium">{formatCount(customEvents)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Client events</span>
              <span className="font-medium">{formatCount(clientEvents)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Server events</span>
              <span className="font-medium">{formatCount(serverEvents)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Anonymous client events</span>
              <span className="font-medium">
                {formatCount(anonymousClientEvents)}
              </span>
            </div>
            <div className="rounded-md border border-dashed p-3 text-xs text-muted-foreground">
              This dashboard works without GA4. GA4 keys only forward a copy of
              server/client events to Google if configured.
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Acquisition Funnel</CardTitle>
            <CardDescription>
              Basic conversion signals from landing to signup
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {funnelSteps.map((step) => {
              const percent = Math.round((step.count / funnelBase) * 100);
              return (
                <div key={step.eventName} className="space-y-1">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm">{step.label}</span>
                    <span className="text-xs text-muted-foreground">
                      {formatCount(step.count)} ({percent}%)
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-muted">
                    <div
                      className="h-2 rounded-full bg-primary"
                      style={{ width: `${Math.max(step.count > 0 ? 6 : 0, percent)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Daily Activity</CardTitle>
            <CardDescription>
              Events and pageviews by day ({range.label})
            </CardDescription>
          </CardHeader>
          <CardContent>
            {activityByDay.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No analytics events captured yet.
              </p>
            ) : (
              <div className="space-y-3">
                {activityByDay.slice(-10).map((row) => (
                  <div key={row.day.toISOString()} className="space-y-1">
                    <div className="flex items-center justify-between gap-3 text-xs">
                      <span className="text-muted-foreground">
                        {row.day.toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                        })}
                      </span>
                      <span className="text-muted-foreground">
                        {formatCount(row.totalEvents)} events ·{" "}
                        {formatCount(row.pageViews)} pageviews
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-muted">
                      <div
                        className="h-2 rounded-full bg-primary"
                        style={{
                          width: `${Math.max(
                            6,
                            Math.round((row.totalEvents / maxDailyEvents) * 100)
                          )}%`,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-1">
          <CardHeader>
            <CardTitle className="text-lg">Top Pages</CardTitle>
            <CardDescription>
              Most viewed paths in the selected time window
            </CardDescription>
          </CardHeader>
          <CardContent>
            <BarList rows={topPages} emptyLabel="No pageviews found." valueLabel="views" />
          </CardContent>
        </Card>

        <Card className="xl:col-span-1">
          <CardHeader>
            <CardTitle className="text-lg">Top Events</CardTitle>
            <CardDescription>
              Most frequent custom analytics events
            </CardDescription>
          </CardHeader>
          <CardContent>
            <BarList rows={topEvents} emptyLabel="No custom events found." valueLabel="events" />
          </CardContent>
        </Card>

        <Card className="xl:col-span-1">
          <CardHeader>
            <CardTitle className="text-lg">Top Referrers</CardTitle>
            <CardDescription>
              Where tracked visitors are coming from
            </CardDescription>
          </CardHeader>
          <CardContent>
            <BarList
              rows={topReferrers}
              emptyLabel="No referrer data yet."
              valueLabel="visits"
            />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Recent Analytics Events</CardTitle>
          <CardDescription>
            Latest {recentEvents.length} tracked events in the selected window
          </CardDescription>
        </CardHeader>
        <CardContent>
          {recentEvents.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No analytics events found for this time range.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1100px] text-left text-sm">
                <thead className="border-b text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="py-3 pr-4 font-medium">Time</th>
                    <th className="py-3 pr-4 font-medium">Event</th>
                    <th className="py-3 pr-4 font-medium">Source</th>
                    <th className="py-3 pr-4 font-medium">Identity</th>
                    <th className="py-3 pr-4 font-medium">Path</th>
                    <th className="py-3 pr-4 font-medium">Referrer</th>
                    <th className="py-3 font-medium">Params</th>
                  </tr>
                </thead>
                <tbody>
                  {recentEvents.map((event) => (
                    <tr key={event.id} className="border-b align-top last:border-0">
                      <td className="py-3 pr-4 text-xs text-muted-foreground">
                        {formatDateTime(event.createdAt)}
                      </td>
                      <td className="py-3 pr-4">
                        <div className="space-y-1">
                          <p className="font-medium">{event.eventName}</p>
                          <p className="text-xs text-muted-foreground">
                            {event.eventType}
                          </p>
                        </div>
                      </td>
                      <td className="py-3 pr-4">
                        <Badge variant={event.source === "server" ? "outline" : "secondary"}>
                          {event.source}
                        </Badge>
                      </td>
                      <td className="py-3 pr-4 text-xs text-muted-foreground">
                        <p>User: {truncate(event.userId, 16)}</p>
                        <p>Visitor: {truncate(event.visitorId, 16)}</p>
                        <p>Session: {truncate(event.sessionId, 16)}</p>
                      </td>
                      <td className="py-3 pr-4 text-xs text-muted-foreground">
                        <span title={event.path ?? ""}>{truncate(event.path, 64)}</span>
                      </td>
                      <td className="py-3 pr-4 text-xs text-muted-foreground">
                        <span title={event.referrer ?? ""}>
                          {truncate(getHostname(event.referrer), 32)}
                        </span>
                      </td>
                      <td className="py-3 text-xs text-muted-foreground">
                        <span title={JSON.stringify(event.params ?? {})}>
                          {getParamsPreview(event.params)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
