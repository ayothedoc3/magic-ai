"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function getImageHistory() {
  const session = await auth();
  if (!session?.user?.id) return [];

  return prisma.generation.findMany({
    where: { userId: session.user.id, type: "IMAGE" },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      input: true,
      imageUrl: true,
      model: true,
      createdAt: true,
    },
    take: 50,
  });
}

export async function deleteImage(id: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  await prisma.generation.deleteMany({
    where: { id, userId: session.user.id, type: "IMAGE" },
  });

  revalidatePath("/images");
}
