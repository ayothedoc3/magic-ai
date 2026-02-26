import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getChatList } from "@/actions/chat";
import { getUserCredits } from "@/lib/credits";
import { ChatLayout } from "@/components/chat/chat-layout";

export default async function ChatPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const [chats, credits] = await Promise.all([
    getChatList(),
    getUserCredits(session.user.id),
  ]);

  return (
    <ChatLayout
      chats={chats}
      credits={credits.text}
    />
  );
}
