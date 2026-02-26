"use client";

import { useState } from "react";
import { Play, Trash2, Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { deleteVideo } from "@/actions/video";
import { useRouter } from "next/navigation";

type VideoItem = {
  id: string;
  input: string | null;
  output: string | null;
  videoUrl: string | null;
  model: string;
  createdAt: Date;
};

type VideoGalleryProps = {
  videos: VideoItem[];
};

function getJobStatus(output: string | null): {
  status: string;
  jobId?: string;
} {
  if (!output) return { status: "unknown" };
  try {
    const parsed = JSON.parse(output);
    return { status: parsed.status || "unknown", jobId: parsed.jobId };
  } catch {
    return { status: "unknown" };
  }
}

export function VideoGallery({ videos }: VideoGalleryProps) {
  const router = useRouter();
  const [playVideo, setPlayVideo] = useState<VideoItem | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  const handleDelete = async (id: string) => {
    setDeleting(id);
    await deleteVideo(id);
    router.refresh();
    setDeleting(null);
    if (playVideo?.id === id) setPlayVideo(null);
  };

  if (videos.length === 0) return null;

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {videos.map((vid) => {
          const { status } = getJobStatus(vid.output);
          const isCompleted = vid.videoUrl || status === "succeeded";
          const isFailed = status === "failed";
          const isProcessing = !isCompleted && !isFailed;

          return (
            <div
              key={vid.id}
              className="overflow-hidden rounded-lg border"
            >
              <div className="relative aspect-video bg-muted">
                {vid.videoUrl ? (
                  <button
                    onClick={() => setPlayVideo(vid)}
                    className="flex h-full w-full items-center justify-center hover:bg-black/10"
                  >
                    <Play className="h-10 w-10 text-primary" />
                  </button>
                ) : isProcessing ? (
                  <div className="flex h-full items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  <div className="flex h-full items-center justify-center">
                    <AlertCircle className="h-8 w-8 text-destructive" />
                  </div>
                )}
              </div>

              <div className="p-3">
                <div className="mb-2 flex items-center gap-2">
                  <Badge
                    variant={
                      isCompleted
                        ? "default"
                        : isFailed
                          ? "destructive"
                          : "secondary"
                    }
                    className="text-xs"
                  >
                    {isCompleted
                      ? "Completed"
                      : isFailed
                        ? "Failed"
                        : "Processing"}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {vid.model}
                  </span>
                </div>
                <p className="truncate text-sm">
                  {vid.input?.slice(0, 80)}
                </p>
                <div className="mt-2 flex justify-end">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                    onClick={() => handleDelete(vid.id)}
                    disabled={deleting === vid.id}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <Dialog open={!!playVideo} onOpenChange={() => setPlayVideo(null)}>
        <DialogContent className="max-w-3xl">
          <DialogTitle className="sr-only">Video Player</DialogTitle>
          {playVideo?.videoUrl && (
            <div className="space-y-3">
              <video
                src={playVideo.videoUrl}
                controls
                autoPlay
                className="w-full rounded-lg"
              />
              {playVideo.input && (
                <p className="text-sm text-muted-foreground">
                  {playVideo.input}
                </p>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
