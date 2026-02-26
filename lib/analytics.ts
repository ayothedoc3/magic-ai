type AnalyticsPrimitive = string | number | boolean | null | undefined;

type AnalyticsParams = Record<string, AnalyticsPrimitive>;

type ClientAnalyticsPayload = {
  eventName: string;
  eventType: "event" | "page_view";
  params?: AnalyticsParams;
  path?: string;
  url?: string;
  referrer?: string;
};

const VISITOR_ID_KEY = "am_visitor_id";
const SESSION_ID_KEY = "am_session_id";
const FIRST_TOUCH_ATTRIBUTION_KEY = "am_first_touch_attr";
const LAST_TOUCH_ATTRIBUTION_KEY = "am_last_touch_attr";
const INTERNAL_ANALYTICS_ENDPOINT = "/api/analytics/events";
const ATTRIBUTION_QUERY_KEYS = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_term",
  "utm_content",
  "gclid",
  "fbclid",
  "msclkid",
] as const;

type AttributionParams = Partial<Record<(typeof ATTRIBUTION_QUERY_KEYS)[number], string>> & {
  landing_path?: string;
  landing_url?: string;
  landing_referrer?: string;
  captured_at?: string;
};

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

function createClientId(prefix: string) {
  const uuid =
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  return `${prefix}_${uuid}`;
}

function getOrCreateStorageValue(
  storageType: "localStorage" | "sessionStorage",
  key: string,
  prefix: string
) {
  if (typeof window === "undefined") return undefined;

  try {
    const storage = window[storageType];
    const existing = storage.getItem(key)?.trim();
    if (existing) return existing;

    const created = createClientId(prefix);
    storage.setItem(key, created);
    return created;
  } catch {
    return undefined;
  }
}

function getVisitorId() {
  return getOrCreateStorageValue("localStorage", VISITOR_ID_KEY, "v");
}

function getSessionId() {
  return getOrCreateStorageValue("sessionStorage", SESSION_ID_KEY, "s");
}

function safeTrim(value: string | null | undefined, maxLength = 500) {
  if (!value) return undefined;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, maxLength) : undefined;
}

function safeJsonParse<T>(value: string | null) {
  if (!value) return null;
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

function getPseoRouteGroup(pathname: string | undefined) {
  if (!pathname) return undefined;
  if (pathname.startsWith("/ai-templates")) return "ai_templates";
  if (pathname.startsWith("/ai-tools")) return "ai_tools";
  if (pathname.startsWith("/ai-generated-examples")) return "ai_generated_examples";
  if (/^\/best-ai-for-[a-z0-9-]+-2026$/.test(pathname)) return "best_ai_2026";
  if (/^\/dall-e-prompts-for-[a-z0-9-]+$/.test(pathname)) return "dalle_prompts";
  return undefined;
}

function getCurrentAttributionFromLocation() {
  if (typeof window === "undefined") return null;

  const url = new URL(window.location.href);
  const params: AttributionParams = {};

  for (const key of ATTRIBUTION_QUERY_KEYS) {
    const value = safeTrim(url.searchParams.get(key), 200);
    if (value) params[key] = value;
  }

  const hasAttribution = Object.keys(params).length > 0;
  if (!hasAttribution) return null;

  params.landing_path = safeTrim(
    `${url.pathname}${url.search}${url.hash}`,
    1000
  );
  params.landing_url = safeTrim(url.toString(), 1500);
  params.landing_referrer = safeTrim(
    typeof document !== "undefined" ? document.referrer : undefined,
    1500
  );
  params.captured_at = new Date().toISOString();

  return params;
}

function readStoredAttribution(storageKey: string) {
  if (typeof window === "undefined") return null;
  try {
    return safeJsonParse<AttributionParams>(window.localStorage.getItem(storageKey));
  } catch {
    return null;
  }
}

function writeStoredAttribution(storageKey: string, value: AttributionParams) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(storageKey, JSON.stringify(value));
  } catch {
    // ignore storage failures
  }
}

function updateAttributionStorage() {
  const current = getCurrentAttributionFromLocation();
  if (!current) {
    return {
      firstTouch: readStoredAttribution(FIRST_TOUCH_ATTRIBUTION_KEY),
      lastTouch: readStoredAttribution(LAST_TOUCH_ATTRIBUTION_KEY),
      currentTouch: null as AttributionParams | null,
    };
  }

  const existingFirst = readStoredAttribution(FIRST_TOUCH_ATTRIBUTION_KEY);
  if (!existingFirst) {
    writeStoredAttribution(FIRST_TOUCH_ATTRIBUTION_KEY, current);
  }
  writeStoredAttribution(LAST_TOUCH_ATTRIBUTION_KEY, current);

  return {
    firstTouch: existingFirst ?? current,
    lastTouch: current,
    currentTouch: current,
  };
}

function flattenAttributionForAnalytics(params: {
  currentPath?: string;
  currentUrl?: string;
}) {
  const { firstTouch, lastTouch, currentTouch } = updateAttributionStorage();
  const out: Record<string, string | number | boolean> = {};

  const pseoRouteGroup = getPseoRouteGroup(
    params.currentPath?.split("?")[0] ??
      (typeof window !== "undefined" ? window.location.pathname : undefined)
  );

  if (pseoRouteGroup) {
    out.pseo_route_group = pseoRouteGroup;
    out.is_pseo_page = 1;
  }

  const currentPath = params.currentPath ?? safeTrim(typeof window !== "undefined" ? window.location.pathname : undefined, 300);
  if (currentPath) {
    out.current_path = currentPath;
  }

  if (currentTouch) {
    for (const key of ATTRIBUTION_QUERY_KEYS) {
      if (currentTouch[key]) out[key] = currentTouch[key]!;
    }
  }

  if (firstTouch) {
    for (const key of ATTRIBUTION_QUERY_KEYS) {
      const value = firstTouch[key];
      if (value) out[`ft_${key}`] = value;
    }
    if (firstTouch.landing_path) out.ft_landing_path = firstTouch.landing_path;
  }

  if (lastTouch) {
    for (const key of ATTRIBUTION_QUERY_KEYS) {
      const value = lastTouch[key];
      if (value) out[`lt_${key}`] = value;
    }
    if (lastTouch.landing_path) out.lt_landing_path = lastTouch.landing_path;
  }

  return Object.keys(out).length > 0 ? out : undefined;
}

function mergeAnalyticsParams(
  base: AnalyticsParams | undefined,
  extra: Record<string, string | number | boolean> | undefined
) {
  if (!base && !extra) return undefined;
  return {
    ...(extra ?? {}),
    ...(base ?? {}),
  };
}

function postInternalClientEvent(payload: ClientAnalyticsPayload) {
  if (typeof window === "undefined") return;

  const eventName = payload.eventName.trim();
  if (!eventName) return;

  const body = {
    eventName,
    eventType: payload.eventType,
    params: sanitizeEventParams(payload.params),
    path: safeTrim(payload.path, 300),
    url: safeTrim(payload.url, 1000),
    referrer: safeTrim(payload.referrer, 1000),
    visitorId: getVisitorId(),
    sessionId: getSessionId(),
  };

  try {
    void fetch(INTERNAL_ANALYTICS_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      keepalive: true,
      cache: "no-store",
    });
  } catch {
    // Swallow tracking errors.
  }
}

export function trackClientEvent(
  eventName: string,
  params?: Record<string, string | number | boolean>
) {
  const attributionParams = flattenAttributionForAnalytics({
    currentPath:
      typeof window !== "undefined"
        ? `${window.location.pathname}${window.location.search}`
        : undefined,
    currentUrl: typeof window !== "undefined" ? window.location.href : undefined,
  });

  const mergedParams = mergeAnalyticsParams(params, attributionParams);

  postInternalClientEvent({
    eventName,
    eventType: "event",
    params: mergedParams,
    path: typeof window !== "undefined" ? window.location.pathname : undefined,
    url: typeof window !== "undefined" ? window.location.href : undefined,
    referrer: typeof document !== "undefined" ? document.referrer : undefined,
  });

  if (typeof window === "undefined" || typeof window.gtag !== "function") return;
  window.gtag("event", eventName, mergedParams);
}

export function trackClientPageView(params?: {
  path?: string;
  url?: string;
  referrer?: string;
}) {
  const fallbackPath =
    typeof window !== "undefined"
      ? `${window.location.pathname}${window.location.search}`
      : undefined;

  const attributionParams = flattenAttributionForAnalytics({
    currentPath: params?.path ?? fallbackPath,
    currentUrl:
      params?.url ??
      (typeof window !== "undefined" ? window.location.href : undefined),
  });

  postInternalClientEvent({
    eventName: "page_view",
    eventType: "page_view",
    params: attributionParams,
    path: params?.path ?? fallbackPath,
    url:
      params?.url ??
      (typeof window !== "undefined" ? window.location.href : undefined),
    referrer:
      params?.referrer ??
      (typeof document !== "undefined" ? document.referrer : undefined),
  });
}

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}
