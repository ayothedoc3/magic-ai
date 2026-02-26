"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ImageForm } from "./image-form";
import { ImageGallery } from "./image-gallery";

type ImageItem = {
  id: string;
  input: string | null;
  imageUrl: string | null;
  model: string;
  createdAt: Date;
};

type ImagesClientProps = {
  images: ImageItem[];
  credits: number;
};

export function ImagesClient({ images, credits: initialCredits }: ImagesClientProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [credits, setCredits] = useState(initialCredits);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async (params: {
    prompt: string;
    size: string;
    quality: string;
    style: string;
  }) => {
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/images/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(params),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Generation failed");
        return;
      }

      setCredits((c) => Math.max(0, c - 1));
      router.refresh();
    } catch {
      setError("Network error — please try again");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <ImageForm
        isLoading={isLoading}
        credits={credits}
        onSubmit={handleGenerate}
      />

      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}

      <div>
        <h2 className="mb-4 text-lg font-semibold">Your Images</h2>
        {images.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No images generated yet. Create your first one above!
          </p>
        ) : (
          <ImageGallery images={images} />
        )}
      </div>
    </div>
  );
}
