"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function getDocuments(search?: string) {
  const session = await auth();
  if (!session?.user?.id) return [];

  const where: {
    userId: string;
    OR?: Array<{ title?: { contains: string; mode: "insensitive" }; content?: { contains: string; mode: "insensitive" } }>;
  } = { userId: session.user.id };

  if (search?.trim()) {
    where.OR = [
      { title: { contains: search, mode: "insensitive" } },
      { content: { contains: search, mode: "insensitive" } },
    ];
  }

  return prisma.document.findMany({
    where,
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      title: true,
      content: true,
      updatedAt: true,
    },
    take: 50,
  });
}

export async function getDocumentById(id: string) {
  const session = await auth();
  if (!session?.user?.id) return null;

  return prisma.document.findFirst({
    where: { id, userId: session.user.id },
  });
}

export async function createDocument() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const doc = await prisma.document.create({
    data: {
      title: "Untitled Document",
      content: "",
      userId: session.user.id,
    },
  });

  redirect(`/documents/${doc.id}`);
}

export async function updateDocument(
  id: string,
  data: { title?: string; content?: string }
) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  await prisma.document.updateMany({
    where: { id, userId: session.user.id },
    data: {
      ...(data.title !== undefined && { title: data.title.slice(0, 200) }),
      ...(data.content !== undefined && { content: data.content }),
    },
  });

  revalidatePath("/documents");
}

export async function deleteDocument(id: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  await prisma.document.deleteMany({
    where: { id, userId: session.user.id },
  });

  revalidatePath("/documents");
}
