import type { Prisma } from "@prisma/client";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import type { Credits } from "@/types";

const DEFAULT_CREDITS: Credits = { text: 0, image: 0 };

export async function requireAdminSession() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  if (session.user.role !== "ADMIN") {
    redirect("/dashboard");
  }

  return session;
}

export function getCreditsFromJson(
  value: Prisma.JsonValue | null | undefined
): Credits {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return DEFAULT_CREDITS;
  }

  const record = value as Record<string, unknown>;

  return {
    text: typeof record.text === "number" ? record.text : 0,
    image: typeof record.image === "number" ? record.image : 0,
  };
}

export function getStringArrayFromJson(
  value: Prisma.JsonValue | null | undefined
): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string");
}

export function getJsonArrayLength(
  value: Prisma.JsonValue | null | undefined
): number {
  return Array.isArray(value) ? value.length : 0;
}

export function formatDateTime(value: Date | null | undefined) {
  if (!value) return "N/A";

  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(value);
}

export function formatUsdCents(cents: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(cents / 100);
}
