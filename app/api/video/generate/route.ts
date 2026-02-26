import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { submitVideoJob } from "@/lib/video";
import { hasEnoughCredits, deductCredits } from "@/lib/credits";
import { CREDIT_COSTS } from "@/lib/constants";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { prompt, duration, aspectRatio, model } = await req.json();

  if (!prompt?.trim()) {
    return Response.json({ error: "Prompt is required" }, { status: 400 });
  }

  const enough = await hasEnoughCredits(
    session.user.id,
    "video",
    CREDIT_COSTS.video
  );
  if (!enough) {
    return Response.json({ error: "Insufficient credits" }, { status: 402 });
  }

  try {
    const { jobId } = await submitVideoJob({ prompt, duration, aspectRatio, model });

    // Deduct credits on submission
    await deductCredits(session.user.id, "video", CREDIT_COSTS.video);

    // Save generation record with job info
    await prisma.generation.create({
      data: {
        userId: session.user.id,
        type: "VIDEO",
        model: model || "minimax-video",
        input: prompt.slice(0, 500),
        output: JSON.stringify({ jobId, status: "processing" }),
        creditCost: CREDIT_COSTS.video,
      },
    });

    return Response.json({ jobId });
  } catch (error) {
    console.error("Video generation error:", error);
    return Response.json(
      { error: error instanceof Error ? error.message : "Generation failed" },
      { status: 500 }
    );
  }
}
