"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { VideoForm } from "./video-form";
import { VideoGallery } from "./video-gallery";

type VideoItem = {
  id: string;
  input: string | null;
  output: string | null;
  videoUrl: string | null;
  model: string;
  createdAt: Date;
};

type VideoClientProps = {
  videos: VideoItem[];
  credits: number;
};

export function VideoClient({
  videos,
  credits: initialCredits,
}: VideoClientProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [credits, setCredits] = useState(initialCredits);
  const [error, setError] = useState<string | null>(null);
  const [pollingJobId, setPollingJobId] = useState<string | null>(null);
  const pollCount = useRef(0);

  const pollStatus = useCallback(
    async (jobId: string) => {
      try {
        const res = await fetch(`/api/video/status/${jobId}`);
        const data = await res.json();

        if (data.status === "succeeded" || data.status === "failed") {
          setPollingJobId(null);
          pollCount.current = 0;
          router.refresh();
          return;
        }

        // Continue polling (max 60 polls = ~5 mins at 5s intervals)
        pollCount.current += 1;
        if (pollCount.current < 60) {
          setTimeout(() => pollStatus(jobId), 5000);
        } else {
          setPollingJobId(null);
          pollCount.current = 0;
          setError("Video generation timed out. Check back later.");
        }
      } catch {
        setPollingJobId(null);
        pollCount.current = 0;
      }
    },
    [router]
  );

  useEffect(() => {
    if (pollingJobId) {
      const timeout = setTimeout(() => pollStatus(pollingJobId), 5000);
      return () => clearTimeout(timeout);
    }
  }, [pollingJobId, pollStatus]);

  const handleGenerate = async (params: {
    prompt: string;
    duration: number;
    aspectRatio: string;
    model: string;
  }) => {
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/video/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(params),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Generation failed");
        return;
      }

      setCredits((c) => Math.max(0, c - 5));
      setPollingJobId(data.jobId);
      router.refresh();
    } catch {
      setError("Network error — please try again");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <VideoForm
        isLoading={isLoading}
        credits={credits}
        onSubmit={handleGenerate}
      />

      {pollingJobId && (
        <div className="flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm dark:border-blue-800 dark:bg-blue-950">
          <div className="h-2 w-2 animate-pulse rounded-full bg-blue-500" />
          Video is being generated. This may take a few minutes...
        </div>
      )}

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div>
        <h2 className="mb-4 text-lg font-semibold">Your Videos</h2>
        {videos.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No videos generated yet. Create your first one above!
          </p>
        ) : (
          <VideoGallery videos={videos} />
        )}
      </div>
    </div>
  );
}
