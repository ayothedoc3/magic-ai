import { streamText } from "ai";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getModel } from "@/lib/ai";
import { hasEnoughCredits, deductCredits } from "@/lib/credits";
import { CREDIT_COSTS } from "@/lib/constants";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { messages, chatId, model = "gpt-4o" } = await req.json();

  if (!chatId || !messages?.length) {
    return Response.json({ error: "Missing chatId or messages" }, { status: 400 });
  }

  // Verify chat ownership
  const chat = await prisma.chat.findFirst({
    where: { id: chatId, userId: session.user.id },
  });
  if (!chat) {
    return Response.json({ error: "Chat not found" }, { status: 404 });
  }

  // Check credits
  const enough = await hasEnoughCredits(session.user.id, "text", CREDIT_COSTS.chat);
  if (!enough) {
    return Response.json({ error: "Insufficient credits" }, { status: 402 });
  }

  const userId = session.user.id;
  const lastUserMessage = messages[messages.length - 1];

  // Extract text content from parts-based or content-based message format
  const userText =
    typeof lastUserMessage.content === "string"
      ? lastUserMessage.content
      : Array.isArray(lastUserMessage.parts)
        ? lastUserMessage.parts
            .filter((p: { type: string }) => p.type === "text")
            .map((p: { text: string }) => p.text)
            .join("")
        : String(lastUserMessage.content ?? "");

  // Save the user message
  await prisma.message.create({
    data: {
      chatId,
      userId,
      role: "USER",
      content: userText,
    },
  });

  const result = streamText({
    model: getModel(model),
    messages,
    onFinish: async ({ text, usage }) => {
      // Save assistant message
      await prisma.message.create({
        data: {
          chatId,
          role: "ASSISTANT",
          content: text,
          model,
          tokens: usage.totalTokens,
        },
      });

      // Deduct credits
      await deductCredits(userId, "text", CREDIT_COSTS.chat);

      // Create generation record
      await prisma.generation.create({
        data: {
          userId,
          type: "CHAT",
          model,
          input: userText.slice(0, 500),
          output: text.slice(0, 500),
          tokens: usage.totalTokens,
          creditCost: CREDIT_COSTS.chat,
        },
      });

      // Auto-title on first message
      const messageCount = await prisma.message.count({ where: { chatId } });
      if (messageCount <= 2) {
        const title = userText.slice(0, 60).trim() || "New Chat";
        await prisma.chat.update({
          where: { id: chatId },
          data: { title, model },
        });
      }

      // Update chat timestamp
      await prisma.chat.update({
        where: { id: chatId },
        data: { updatedAt: new Date() },
      });
    },
  });

  return result.toUIMessageStreamResponse();
}
