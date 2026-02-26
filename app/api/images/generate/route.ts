import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateImage } from "@/lib/dalle";
import { hasEnoughCredits, deductCredits } from "@/lib/credits";
import { CREDIT_COSTS } from "@/lib/constants";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { prompt, size, quality, style } = await req.json();

  if (!prompt?.trim()) {
    return Response.json({ error: "Prompt is required" }, { status: 400 });
  }

  const enough = await hasEnoughCredits(
    session.user.id,
    "image",
    CREDIT_COSTS.image
  );
  if (!enough) {
    return Response.json({ error: "Insufficient credits" }, { status: 402 });
  }

  try {
    const result = await generateImage({ prompt, size, quality, style });

    // Deduct credits
    await deductCredits(session.user.id, "image", CREDIT_COSTS.image);

    // Save generation record
    await prisma.generation.create({
      data: {
        userId: session.user.id,
        type: "IMAGE",
        model: "dall-e-3",
        input: prompt.slice(0, 500),
        imageUrl: result.url,
        creditCost: CREDIT_COSTS.image,
      },
    });

    return Response.json({
      url: result.url,
      revisedPrompt: result.revisedPrompt,
    });
  } catch (error) {
    console.error("Image generation error:", error);
    return Response.json(
      { error: error instanceof Error ? error.message : "Generation failed" },
      { status: 500 }
    );
  }
}
