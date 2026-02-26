"use client";

import { useState } from "react";
import { Loader2, Video } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

type VideoFormProps = {
  isLoading: boolean;
  credits: number;
  onSubmit: (params: {
    prompt: string;
    duration: number;
    aspectRatio: string;
    model: string;
  }) => void;
};

export function VideoForm({ isLoading, credits, onSubmit }: VideoFormProps) {
  const [prompt, setPrompt] = useState("");
  const [duration, setDuration] = useState(5);
  const [aspectRatio, setAspectRatio] = useState("16:9");
  const [model, setModel] = useState("minimax-video");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) return;
    onSubmit({ prompt, duration, aspectRatio, model });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="prompt">Describe your video</Label>
        <Textarea
          id="prompt"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="A drone shot flying over a tropical island at golden hour..."
          rows={3}
          required
        />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label htmlFor="model">Model</Label>
          <select
            id="model"
            value={model}
            onChange={(e) => setModel(e.target.value)}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <option value="minimax-video">Minimax Video-01</option>
            <option value="luma-dream">Luma Dream Machine</option>
            <option value="stable-video">Stable Video Diffusion</option>
          </select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="duration">Duration (sec)</Label>
          <select
            id="duration"
            value={duration}
            onChange={(e) => setDuration(Number(e.target.value))}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <option value={3}>3 seconds</option>
            <option value={5}>5 seconds</option>
            <option value={10}>10 seconds</option>
          </select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="aspect">Aspect Ratio</Label>
          <select
            id="aspect"
            value={aspectRatio}
            onChange={(e) => setAspectRatio(e.target.value)}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <option value="16:9">Landscape (16:9)</option>
            <option value="9:16">Portrait (9:16)</option>
            <option value="1:1">Square (1:1)</option>
          </select>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <Button
          type="submit"
          disabled={isLoading || credits <= 0 || !prompt.trim()}
          className="gap-2"
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Video className="h-4 w-4" />
          )}
          {isLoading ? "Submitting..." : "Generate Video"}
        </Button>
        <p className="text-xs text-muted-foreground">
          Cost: 5 credits &middot; {credits} remaining
        </p>
      </div>
    </form>
  );
}
