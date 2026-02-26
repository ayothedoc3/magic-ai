import "server-only";
import Replicate from "replicate";

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
});

type VideoGenerateParams = {
  prompt: string;
  duration?: number;
  aspectRatio?: "16:9" | "9:16" | "1:1";
  model?: string;
};

type VideoJob = {
  id: string;
  status: "starting" | "processing" | "succeeded" | "failed" | "canceled";
  output: string | string[] | null;
  error: string | null;
};

const MODEL_MAP: Record<string, string> = {
  "minimax-video": "minimax/video-01",
  "luma-dream": "luma/dream-machine",
  "stable-video": "stability-ai/stable-video-diffusion",
};

export async function submitVideoJob({
  prompt,
  duration = 5,
  aspectRatio = "16:9",
  model = "minimax-video",
}: VideoGenerateParams): Promise<{ jobId: string }> {
  const modelId = MODEL_MAP[model] || MODEL_MAP["minimax-video"];

  const prediction = await replicate.predictions.create({
    model: modelId as `${string}/${string}`,
    input: {
      prompt,
      duration,
      aspect_ratio: aspectRatio,
    },
  });

  return { jobId: prediction.id };
}

export async function getVideoJobStatus(jobId: string): Promise<VideoJob> {
  const prediction = await replicate.predictions.get(jobId);

  let output: string | null = null;
  if (prediction.output) {
    output = Array.isArray(prediction.output)
      ? prediction.output[0]
      : typeof prediction.output === "string"
        ? prediction.output
        : null;
  }

  return {
    id: prediction.id,
    status: prediction.status as VideoJob["status"],
    output: output,
    error: prediction.error ? String(prediction.error) : null,
  };
}
