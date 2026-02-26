"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function createChat(model: string = "gpt-4o") {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const chat = await prisma.chat.create({
    data: {
      userId: session.user.id,
      model,
      title: "New Chat",
    },
  });

  redirect(`/chat/${chat.id}`);
}

export async function deleteChat(chatId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  await prisma.chat.deleteMany({
    where: { id: chatId, userId: session.user.id },
  });

  revalidatePath("/chat");
}

export async function updateChatTitle(chatId: string, title: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  await prisma.chat.updateMany({
    where: { id: chatId, userId: session.user.id },
    data: { title: title.slice(0, 100) },
  });

  revalidatePath("/chat");
}

export async function getChatList() {
  const session = await auth();
  if (!session?.user?.id) return [];

  return prisma.chat.findMany({
    where: { userId: session.user.id },
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      title: true,
      model: true,
      updatedAt: true,
      _count: { select: { messages: true } },
    },
    take: 50,
  });
}

export async function getChatMessages(chatId: string) {
  const session = await auth();
  if (!session?.user?.id) return [];

  const chat = await prisma.chat.findFirst({
    where: { id: chatId, userId: session.user.id },
  });
  if (!chat) return [];

  return prisma.message.findMany({
    where: { chatId },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      role: true,
      content: true,
      model: true,
      createdAt: true,
    },
  });
}
