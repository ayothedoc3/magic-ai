"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { Plus, Trash2, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createChat, deleteChat } from "@/actions/chat";
import { cn } from "@/lib/utils";

type Chat = {
  id: string;
  title: string;
  model: string;
  updatedAt: Date;
  _count: { messages: number };
};

type ChatSidebarProps = {
  chats: Chat[];
};

export function ChatSidebar({ chats }: ChatSidebarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [deleting, setDeleting] = useState<string | null>(null);

  const handleDelete = async (e: React.MouseEvent, chatId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setDeleting(chatId);
    await deleteChat(chatId);
    if (pathname === `/chat/${chatId}`) {
      router.push("/chat");
    }
    router.refresh();
    setDeleting(null);
  };

  return (
    <div className="flex h-full w-64 flex-col border-r bg-muted/30">
      <div className="p-3">
        <form action={() => createChat()}>
          <Button variant="outline" className="w-full gap-2" size="sm" type="submit">
            <Plus className="h-4 w-4" />
            New Chat
          </Button>
        </form>
      </div>

      <div className="flex-1 overflow-y-auto px-2 pb-2">
        {chats.length === 0 ? (
          <p className="px-3 py-8 text-center text-xs text-muted-foreground">
            No conversations yet
          </p>
        ) : (
          <div className="space-y-1">
            {chats.map((chat) => {
              const isActive = pathname === `/chat/${chat.id}`;
              return (
                <Link
                  key={chat.id}
                  href={`/chat/${chat.id}`}
                  className={cn(
                    "group flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors hover:bg-accent",
                    isActive && "bg-accent"
                  )}
                >
                  <MessageSquare className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <span className="flex-1 truncate">{chat.title}</span>
                  <button
                    onClick={(e) => handleDelete(e, chat.id)}
                    disabled={deleting === chat.id}
                    className="hidden shrink-0 rounded p-1 text-muted-foreground hover:text-destructive group-hover:block"
                    aria-label="Delete chat"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
