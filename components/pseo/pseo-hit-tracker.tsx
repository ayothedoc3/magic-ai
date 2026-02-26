"use client";

import { useEffect } from "react";

interface PseoHitTrackerProps {
  pageId: string;
  slug: string;
  pageType: string;
}

export function PseoHitTracker({ pageId, slug, pageType }: PseoHitTrackerProps) {
  useEffect(() => {
    if (!pageId) return;

    const payload = JSON.stringify({ pageId, slug, pageType });

    try {
      if (typeof navigator !== "undefined" && typeof navigator.sendBeacon === "function") {
        const blob = new Blob([payload], { type: "application/json" });
        navigator.sendBeacon("/api/pseo/hit", blob);
        return;
      }
    } catch {
      // Fall back to fetch below.
    }

    void fetch("/api/pseo/hit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: payload,
      keepalive: true,
      cache: "no-store",
    }).catch(() => {
      // Ignore analytics-like errors.
    });
  }, [pageId, slug, pageType]);

  return null;
}

