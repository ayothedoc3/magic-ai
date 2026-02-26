"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Check, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { updateDocument } from "@/actions/documents";

type DocumentEditorProps = {
  documentId: string;
  initialTitle: string;
  initialContent: string;
};

export function DocumentEditor({
  documentId,
  initialTitle,
  initialContent,
}: DocumentEditorProps) {
  const [title, setTitle] = useState(initialTitle);
  const [content, setContent] = useState(initialContent);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const save = useCallback(
    async (data: { title?: string; content?: string }) => {
      setSaving(true);
      setSaved(false);
      await updateDocument(documentId, data);
      setSaving(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    },
    [documentId]
  );

  const debouncedSave = useCallback(
    (data: { title?: string; content?: string }) => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => save(data), 800);
    },
    [save]
  );

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const handleTitleChange = (value: string) => {
    setTitle(value);
    debouncedSave({ title: value });
  };

  const handleContentChange = (value: string) => {
    setContent(value);
    debouncedSave({ content: value });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Input
          value={title}
          onChange={(e) => handleTitleChange(e.target.value)}
          className="text-lg font-semibold"
          placeholder="Document title..."
        />
        <div className="flex shrink-0 items-center gap-1 text-xs text-muted-foreground">
          {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          {saved && <Check className="h-3.5 w-3.5 text-green-500" />}
          {saving ? "Saving..." : saved ? "Saved" : ""}
        </div>
      </div>

      <Textarea
        value={content}
        onChange={(e) => handleContentChange(e.target.value)}
        placeholder="Start writing..."
        className="min-h-[500px] resize-y font-mono text-sm"
      />
    </div>
  );
}
