"use client";

import { useState } from "react";
import Image from "next/image";
import { Download, Trash2, Expand } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { deleteImage } from "@/actions/images";
import { useRouter } from "next/navigation";

type ImageItem = {
  id: string;
  input: string | null;
  imageUrl: string | null;
  model: string;
  createdAt: Date;
};

type ImageGalleryProps = {
  images: ImageItem[];
};

export function ImageGallery({ images }: ImageGalleryProps) {
  const router = useRouter();
  const [viewImage, setViewImage] = useState<ImageItem | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  const handleDelete = async (id: string) => {
    setDeleting(id);
    await deleteImage(id);
    router.refresh();
    setDeleting(null);
    if (viewImage?.id === id) setViewImage(null);
  };

  if (images.length === 0) {
    return null;
  }

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {images.map((img) =>
          img.imageUrl ? (
            <div
              key={img.id}
              className="group relative overflow-hidden rounded-lg border"
            >
              <Image
                src={img.imageUrl}
                alt={img.input || "Generated image"}
                width={512}
                height={512}
                className="aspect-square w-full object-cover"
              />
              <div className="absolute inset-0 flex items-end bg-gradient-to-t from-black/60 to-transparent opacity-0 transition-opacity group-hover:opacity-100">
                <div className="flex w-full items-center justify-between p-3">
                  <p className="truncate text-xs text-white">
                    {img.input?.slice(0, 60)}
                  </p>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-white hover:bg-white/20"
                      onClick={() => setViewImage(img)}
                    >
                      <Expand className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-white hover:bg-white/20"
                      asChild
                    >
                      <a
                        href={img.imageUrl}
                        download
                        target="_blank"
                        rel="noreferrer"
                      >
                        <Download className="h-4 w-4" />
                      </a>
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-white hover:bg-red-500/50"
                      onClick={() => handleDelete(img.id)}
                      disabled={deleting === img.id}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ) : null
        )}
      </div>

      {/* Full-size viewer */}
      <Dialog open={!!viewImage} onOpenChange={() => setViewImage(null)}>
        <DialogContent className="max-w-3xl">
          <DialogTitle className="sr-only">Image Preview</DialogTitle>
          {viewImage?.imageUrl && (
            <div className="space-y-3">
              <Image
                src={viewImage.imageUrl}
                alt={viewImage.input || "Generated image"}
                width={1024}
                height={1024}
                className="w-full rounded-lg"
              />
              {viewImage.input && (
                <p className="text-sm text-muted-foreground">
                  {viewImage.input}
                </p>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
