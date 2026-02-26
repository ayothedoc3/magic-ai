"use client";

import { useRef, type KeyboardEvent } from "react";
import { SendHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

type ChatInputProps = {
  input: string;
  setInput: (value: string) => void;
  onSubmit: () => void;
  isLoading: boolean;
  credits: number;
};

export function ChatInput({ input, setInput, onSubmit, isLoading, credits }: ChatInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (input.trim() && !isLoading && credits > 0) {
        onSubmit();
      }
    }
  };

  return (
    <div className="border-t bg-background p-4">
      <div className="mx-auto max-w-3xl">
        <div className="flex items-end gap-2">
          <Textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              credits <= 0
                ? "No credits remaining..."
                : "Type a message... (Enter to send, Shift+Enter for newline)"
            }
            disabled={isLoading || credits <= 0}
            className="min-h-[44px] max-h-[200px] resize-none"
            rows={1}
          />
          <Button
            onClick={onSubmit}
            disabled={!input.trim() || isLoading || credits <= 0}
            size="icon"
            className="shrink-0"
          >
            <SendHorizontal className="h-4 w-4" />
          </Button>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          {credits} text credit{credits !== 1 ? "s" : ""} remaining
        </p>
      </div>
    </div>
  );
}
