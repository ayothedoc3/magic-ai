import { GeneratedPageType } from "@prisma/client";

type PseoIndexingInput = {
  pageType: GeneratedPageType;
  hitCount: number;
  createdAt: Date;
  lastHitAt?: Date | null;
};

function parseIntEnv(name: string, fallback: number) {
  const raw = process.env[name];
  if (!raw) return fallback;
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function getPseoIndexingConfig() {
  return {
    lowHitThreshold: Math.max(0, parseIntEnv("PSEO_NOINDEX_LOW_HIT_THRESHOLD", 2)),
    ageDays: Math.max(1, parseIntEnv("PSEO_NOINDEX_LOW_HIT_AGE_DAYS", 30)),
    recentHitGraceDays: Math.max(
      1,
      parseIntEnv("PSEO_NOINDEX_RECENT_HIT_GRACE_DAYS", 14)
    ),
  };
}

function ageInDays(from: Date, to = new Date()) {
  return Math.floor((to.getTime() - from.getTime()) / (24 * 60 * 60 * 1000));
}

export function shouldNoindexPseoPage(page: PseoIndexingInput) {
  if (process.env.PSEO_DISABLE_NOINDEX_POLICY === "1") {
    return false;
  }

  // Keep primary template pages indexable by default.
  if (page.pageType === GeneratedPageType.TEMPLATE) {
    return false;
  }

  const config = getPseoIndexingConfig();
  if (page.hitCount >= config.lowHitThreshold) {
    return false;
  }

  if (ageInDays(page.createdAt) < config.ageDays) {
    return false;
  }

  if (page.lastHitAt && ageInDays(page.lastHitAt) <= config.recentHitGraceDays) {
    return false;
  }

  return true;
}

