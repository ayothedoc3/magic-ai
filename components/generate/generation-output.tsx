"use client";

import { useState } from "react";
import { Check, Copy, FileText, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { saveGenerationToDocument } from "@/actions/generate";
import { useRouter } from "next/navigation";

type GenerationOutputProps = {
  output: string;
  isLoading: boolean;
  templateId?: string;
};

export function GenerationOutput({
  output,
  isLoading,
  templateId,
}: GenerationOutputProps) {
  const router = useRouter();
  const [copied, setCopied] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(output);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSave = async () => {
    if (!output.trim()) return;
    setSaving(true);
    const title = output.split("\n")[0].replace(/^#+\s*/, "").slice(0, 100) || "Generated Content";
    const doc = await saveGenerationToDocument(title, output, templateId);
    setSaving(false);
    router.push(`/documents/${doc.id}`);
  };

  if (!output && !isLoading) {
    return (
      <div className="flex min-h-[300px] items-center justify-center rounded-lg border border-dashed">
        <p className="text-sm text-muted-foreground">
          Generated content will appear here
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">
          {isLoading ? "Generating..." : "Output"}
        </h3>
        {output && (
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopy}
              className="gap-1.5"
            >
              {copied ? (
                <Check className="h-3.5 w-3.5" />
              ) : (
                <Copy className="h-3.5 w-3.5" />
              )}
              {copied ? "Copied" : "Copy"}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleSave}
              disabled={saving || isLoading}
              className="gap-1.5"
            >
              {saving ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <FileText className="h-3.5 w-3.5" />
              )}
              Save to Documents
            </Button>
          </div>
        )}
      </div>

      <div className="min-h-[300px] rounded-lg border bg-muted/30 p-4">
        {isLoading && !output && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Generating content...
          </div>
        )}
        <div className="prose prose-sm dark:prose-invert max-w-none">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{output}</ReactMarkdown>
        </div>
      </div>
    </div>
  );
}
