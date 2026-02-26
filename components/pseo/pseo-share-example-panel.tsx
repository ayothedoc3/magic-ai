"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { GeneratedPageType } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trackClientEvent } from "@/lib/analytics";

type PseoShareExamplePanelProps = {
  templateId: string;
  templateName: string;
  sourceSlug: string;
  currentPageType: GeneratedPageType;
  analyticsSource?: string;
  defaultNiche?: string;
  defaultTone?: string;
  defaultPlatform?: string;
  sampleInputText: string;
  sampleOutputText: string;
};

type ShareResponse = {
  ok: boolean;
  error?: string;
  path?: string;
};

function humanizePageType(pageType: GeneratedPageType) {
  switch (pageType) {
    case GeneratedPageType.TOOL_EXAMPLES:
      return "tool example";
    case GeneratedPageType.BEST_AI_2026:
      return "comparison page";
    case GeneratedPageType.DALLE_PROMPTS:
      return "prompt page";
    case GeneratedPageType.GENERATED_EXAMPLE:
      return "example page";
    default:
      return "template page";
  }
}

export function PseoShareExamplePanel(props: PseoShareExamplePanelProps) {
  const [niche, setNiche] = useState(props.defaultNiche ?? "");
  const [tone, setTone] = useState(props.defaultTone ?? "");
  const [platform, setPlatform] = useState(props.defaultPlatform ?? "");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sharedPath, setSharedPath] = useState<string | null>(null);

  const canSuggestPlatform = useMemo(() => {
    return props.templateName.toLowerCase().includes("tweet") ||
      props.templateName.toLowerCase().includes("social") ||
      props.currentPageType === GeneratedPageType.TOOL_EXAMPLES;
  }, [props.currentPageType, props.templateName]);

  async function handleShare() {
    setIsSubmitting(true);
    setError(null);
    setSharedPath(null);

    try {
      const response = await fetch("/api/pseo/share-example", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          templateId: props.templateId,
          pageType: GeneratedPageType.GENERATED_EXAMPLE,
          niche: niche.trim() || undefined,
          tone: tone.trim() || undefined,
          platform: platform.trim() || undefined,
          sourceSlug: props.sourceSlug,
          sharedInputText: props.sampleInputText,
          sharedOutputText: props.sampleOutputText,
        }),
      });

      const data = (await response.json()) as ShareResponse;
      if (!response.ok || !data.ok || !data.path) {
        if (response.status === 401) {
          setError("Sign in required to share examples.");
        } else {
          setError(data.error ?? "Unable to create shared page.");
        }
        return;
      }

      setSharedPath(data.path);
      trackClientEvent("pseo_share_example_created", {
        source_page_type: props.analyticsSource ?? props.currentPageType,
        target_page_type: GeneratedPageType.GENERATED_EXAMPLE,
        has_niche: Boolean(niche.trim()),
        has_tone: Boolean(tone.trim()),
        has_platform: Boolean(platform.trim()),
      });

      if (typeof window !== "undefined" && navigator.clipboard?.writeText) {
        const absolute = new URL(data.path, window.location.origin).toString();
        void navigator.clipboard.writeText(absolute);
      }
    } catch {
      setError("Network error while sharing example.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="space-y-4 rounded-lg border bg-muted/20 p-4">
      <div className="space-y-1">
        <h3 className="text-sm font-semibold">Share This As A pSEO Example</h3>
        <p className="text-xs text-muted-foreground">
          Creates a shareable, indexable {humanizePageType(GeneratedPageType.GENERATED_EXAMPLE)} URL
          using this page&apos;s sample input/output. Sign-in required.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor={`share-niche-${props.templateId}`}>Niche (optional)</Label>
          <Input
            id={`share-niche-${props.templateId}`}
            placeholder="fitness, ecommerce, real-estate"
            value={niche}
            onChange={(event) => setNiche(event.target.value)}
            maxLength={80}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={`share-tone-${props.templateId}`}>Tone (optional)</Label>
          <Input
            id={`share-tone-${props.templateId}`}
            placeholder="professional, witty, direct"
            value={tone}
            onChange={(event) => setTone(event.target.value)}
            maxLength={80}
          />
        </div>
      </div>

      {canSuggestPlatform ? (
        <div className="space-y-1.5">
          <Label htmlFor={`share-platform-${props.templateId}`}>Platform (optional)</Label>
          <Input
            id={`share-platform-${props.templateId}`}
            placeholder="Twitter/X, LinkedIn, Instagram"
            value={platform}
            onChange={(event) => setPlatform(event.target.value)}
            maxLength={80}
          />
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" onClick={handleShare} disabled={isSubmitting}>
          {isSubmitting ? "Creating..." : "Create Shareable Example URL"}
        </Button>
        {sharedPath ? (
          <Link href={sharedPath} className="text-sm font-medium text-primary hover:underline">
            Open shared page
          </Link>
        ) : null}
        {error ? (
          <span className="text-xs text-destructive">
            {error}{" "}
            {error.includes("Sign in") ? (
              <Link href="/login" className="underline">
                Login
              </Link>
            ) : null}
          </span>
        ) : null}
      </div>

      {sharedPath ? (
        <p className="text-xs text-muted-foreground">
          URL copied to clipboard (if allowed by your browser): {sharedPath}
        </p>
      ) : null}
    </div>
  );
}
