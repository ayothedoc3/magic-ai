"use client";

import { useState, useMemo } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useRouter } from "next/navigation";
import type { UIMessage } from "ai";
import { ChatSidebar } from "./chat-sidebar";
import { ChatMessages } from "./chat-messages";
import { ChatInput } from "./chat-input";
import { ModelSelector } from "./model-selector";

type Chat = {
  id: string;
  title: string;
  model: string;
  updatedAt: Date;
  _count: { messages: number };
};

type ChatLayoutProps = {
  chats: Chat[];
  activeChatId?: string;
  initialMessages?: UIMessage[];
  initialModel?: string;
  credits: number;
};

export function ChatLayout({
  chats,
  activeChatId,
  initialMessages = [],
  initialModel = "gpt-4o",
  credits: initialCredits,
}: ChatLayoutProps) {
  const router = useRouter();
  const [model, setModel] = useState(initialModel);
  const [credits, setCredits] = useState(initialCredits);
  const [input, setInput] = useState("");

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/chat",
        body: { chatId: activeChatId, model },
      }),
    [activeChatId, model]
  );

  const {
    messages,
    sendMessage,
    status,
    error,
  } = useChat({
    transport,
    messages: initialMessages,
    onFinish: () => {
      setCredits((c) => Math.max(0, c - 1));
      router.refresh();
    },
    onError: (err) => {
      console.error("Chat error:", err.message);
    },
  });

  const isLoading = status === "streaming" || status === "submitted";

  const handleSend = () => {
    const text = input.trim();
    if (!text || isLoading || credits <= 0) return;
    setInput("");
    sendMessage({ text });
  };

  return (
    <div className="flex h-[calc(100vh-4rem)] overflow-hidden">
      <div className="hidden md:block">
        <ChatSidebar chats={chats} />
      </div>

      <div className="flex flex-1 flex-col">
        {activeChatId ? (
          <>
            {/* Header */}
            <div className="flex items-center justify-between border-b px-4 py-2">
              <ModelSelector value={model} onChange={setModel} />
              {error && (
                <p className="text-xs text-destructive">
                  {error.message || "Something went wrong"}
                </p>
              )}
            </div>

            {/* Messages */}
            <ChatMessages messages={messages} isLoading={isLoading} />

            {/* Input */}
            <ChatInput
              input={input}
              setInput={setInput}
              onSubmit={handleSend}
              isLoading={isLoading}
              credits={credits}
            />
          </>
        ) : (
          <div className="flex flex-1 items-center justify-center">
            <div className="text-center">
              <h2 className="mb-2 text-xl font-semibold">AI Chat</h2>
              <p className="mb-4 text-sm text-muted-foreground">
                Select a conversation or start a new one
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
