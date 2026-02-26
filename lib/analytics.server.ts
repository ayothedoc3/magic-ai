import "server-only";

import { createHash } from "crypto";
import { prisma } from "@/lib/prisma";

type AnalyticsPrimitive = string | number | boolean | null | undefined;

type AnalyticsParams = Record<string, AnalyticsPrimitive>;

type InternalAnalyticsEventInput = {
  eventName: string;
  eventType?: "event" | "page_view";
  source?: "client" | "server";
  userId?: string | null;
  teamId?: string | null;
  visitorId?: string | null;
  sessionId?: string | null;
  path?: string | null;
  url?: string | null;
  referrer?: string | null;
  userAgent?: string | null;
  ipAddress?: string | null;
  params?: AnalyticsParams;
};

function getGa4Config() {
  const measurementId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID?.trim();
  const apiSecret = process.env.GA4_API_SECRET?.trim();

  if (!measurementId || !apiSecret) {
    return null;
  }

  return { measurementId, apiSecret };
}

function safeTrim(value: string | null | undefined, maxLength = 500) {
  if (!value) return undefined;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, maxLength) : undefined;
}

function sanitizeEventParams(params: AnalyticsParams | undefined) {
  if (!params) return undefined;

  const sanitized: Record<string, string | number> = {};

  for (const [key, value] of Object.entries(params)) {
    if (value == null) continue;

    if (typeof value === "boolean") {
      sanitized[key] = value ? 1 : 0;
      continue;
    }

    if (typeof value === "string") {
      const trimmed = value.trim();
      if (!trimmed) continue;
      sanitized[key] = trimmed.slice(0, 200);
      continue;
    }

    if (typeof value === "number" && Number.isFinite(value)) {
      sanitized[key] = value;
    }
  }

  return Object.keys(sanitized).length > 0 ? sanitized : undefined;
}

function buildClientId(seed?: string | null) {
  const normalized = (seed ?? "anonymous").replace(/[^a-zA-Z0-9._-]/g, "-");
  return `${normalized}.${Math.floor(Date.now() / 1000)}`;
}

function hashIpAddress(ipAddress: string | null | undefined) {
  const normalized = safeTrim(ipAddress, 200);
  if (!normalized) return undefined;

  return createHash("sha256")
    .update(`${normalized}:${process.env.NEXTAUTH_SECRET ?? "am_analytics"}`)
    .digest("hex");
}

export async function trackInternalAnalyticsEvent(
  params: InternalAnalyticsEventInput
) {
  const eventName = safeTrim(params.eventName, 100);
  if (!eventName) return false;

  try {
    await prisma.analyticsEvent.create({
      data: {
        eventName,
        eventType: params.eventType ?? "event",
        source: params.source ?? "server",
        userId: safeTrim(params.userId ?? undefined, 100),
        teamId: safeTrim(params.teamId ?? undefined, 100),
        visitorId: safeTrim(params.visitorId ?? undefined, 150),
        sessionId: safeTrim(params.sessionId ?? undefined, 150),
        path: safeTrim(params.path ?? undefined, 500),
        url: safeTrim(params.url ?? undefined, 1500),
        referrer: safeTrim(params.referrer ?? undefined, 1500),
        userAgent: safeTrim(params.userAgent ?? undefined, 2000),
        ipHash: hashIpAddress(params.ipAddress),
        params: sanitizeEventParams(params.params),
      },
    });

    return true;
  } catch {
    return false;
  }
}

export function isGa4ServerEventTrackingEnabled() {
  return Boolean(getGa4Config());
}

async function sendGa4Event(params: {
  eventName: string;
  clientId?: string | null;
  userId?: string | null;
  params?: AnalyticsParams;
}) {
  const config = getGa4Config();
  if (!config) return false;

  const eventName = params.eventName.trim();
  if (!eventName) return false;

  try {
    const response = await fetch(
      `https://www.google-analytics.com/mp/collect?measurement_id=${encodeURIComponent(
        config.measurementId
      )}&api_secret=${encodeURIComponent(config.apiSecret)}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          client_id: buildClientId(params.clientId ?? params.userId),
          user_id: params.userId ?? undefined,
          timestamp_micros: String(Date.now() * 1000),
          events: [
            {
              name: eventName,
              params: sanitizeEventParams(params.params),
            },
          ],
        }),
        cache: "no-store",
      }
    );

    return response.ok;
  } catch {
    return false;
  }
}

export async function trackGa4ServerEvent(params: {
  eventName: string;
  clientId?: string | null;
  userId?: string | null;
  teamId?: string | null;
  params?: AnalyticsParams;
}) {
  const [internalTracked, gaTracked] = await Promise.all([
    trackInternalAnalyticsEvent({
      eventName: params.eventName,
      eventType: "event",
      source: "server",
      userId: params.userId ?? null,
      teamId: params.teamId ?? null,
      visitorId: params.clientId ?? null,
      params: params.params,
    }),
    sendGa4Event(params),
  ]);

  return internalTracked || gaTracked;
}

export async function trackBillingConversionServerEvent(params: {
  userId?: string | null;
  transactionId: string;
  value: number;
  currency?: string;
  planName?: string | null;
  planId?: string | null;
}) {
  return trackGa4ServerEvent({
    eventName: "purchase",
    userId: params.userId ?? null,
    params: {
      transaction_id: params.transactionId,
      value: params.value,
      currency: params.currency ?? "USD",
      item_name: params.planName ?? undefined,
      item_id: params.planId ?? undefined,
    },
  });
}

