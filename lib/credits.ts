import "server-only";
import { prisma } from "./prisma";

export type Credits = { text: number; image: number; video: number };

const DEFAULT_CREDITS: Credits = { text: 0, image: 0, video: 0 };

export function parseCredits(json: unknown): Credits {
  if (json && typeof json === "object" && !Array.isArray(json)) {
    const obj = json as Record<string, unknown>;
    return {
      text: typeof obj.text === "number" ? obj.text : 0,
      image: typeof obj.image === "number" ? obj.image : 0,
      video: typeof obj.video === "number" ? obj.video : 0,
    };
  }
  return { ...DEFAULT_CREDITS };
}

export async function getUserCredits(userId: string): Promise<Credits> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { credits: true },
  });
  return parseCredits(user?.credits);
}

export async function hasEnoughCredits(
  userId: string,
  type: "text" | "image" | "video",
  amount: number
): Promise<boolean> {
  const credits = await getUserCredits(userId);
  return credits[type] >= amount;
}

export async function deductCredits(
  userId: string,
  type: "text" | "image" | "video",
  amount: number
): Promise<Credits> {
  const current = await getUserCredits(userId);
  const newValue = Math.max(0, current[type] - amount);
  const updated = { ...current, [type]: newValue };

  await prisma.user.update({
    where: { id: userId },
    data: { credits: updated },
  });

  return updated;
}
