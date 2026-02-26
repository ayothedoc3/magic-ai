import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { getChatList, getChatMessages } from "@/actions/chat";
import { getUserCredits } from "@/lib/credits";
import { prisma } from "@/lib/prisma";
import { ChatLayout } from "@/components/chat/chat-layout";

type Props = {
  params: { chatId: string };
};

export default async function ChatConversationPage({ params }: Props) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const chat = await prisma.chat.findFirst({
    where: { id: params.chatId, userId: session.user.id },
  });
  if (!chat) notFound();

  const [chats, messages, credits] = await Promise.all([
    getChatList(),
    getChatMessages(params.chatId),
    getUserCredits(session.user.id),
  ]);

  const initialMessages = messages.map((m) => ({
    id: m.id,
    role: m.role.toLowerCase() as "user" | "assistant" | "system",
    parts: [{ type: "text" as const, text: m.content }],
  }));

  return (
    <ChatLayout
      chats={chats}
      activeChatId={params.chatId}
      initialMessages={initialMessages}
      initialModel={chat.model}
      credits={credits.text}
    />
  );
}
