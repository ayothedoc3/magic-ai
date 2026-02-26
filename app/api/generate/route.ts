import { streamText } from "ai";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getModel } from "@/lib/ai";
import { hasEnoughCredits, deductCredits } from "@/lib/credits";
import { CREDIT_COSTS } from "@/lib/constants";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { templateSlug, fields, model = "gpt-4o" } = await req.json();

  if (!templateSlug || !fields) {
    return Response.json(
      { error: "Missing templateSlug or fields" },
      { status: 400 }
    );
  }

  // Fetch template
  const template = await prisma.template.findUnique({
    where: { slug: templateSlug },
  });
  if (!template || !template.active) {
    return Response.json({ error: "Template not found" }, { status: 404 });
  }

  // Check credits
  const enough = await hasEnoughCredits(
    session.user.id,
    "text",
    CREDIT_COSTS.generate
  );
  if (!enough) {
    return Response.json({ error: "Insufficient credits" }, { status: 402 });
  }

  // Interpolate template prompt with user fields
  const prompt = template.prompt.replace(
    /\{\{(\w+)\}\}/g,
    (_, key: string) => (fields[key] as string) || ""
  );

  const userId = session.user.id;

  const result = streamText({
    model: getModel(model),
    prompt,
    onFinish: async ({ text, usage }) => {
      // Deduct credits
      await deductCredits(userId, "text", CREDIT_COSTS.generate);

      // Create generation record
      await prisma.generation.create({
        data: {
          userId,
          type: "TEXT",
          model,
          input: prompt.slice(0, 500),
          output: text.slice(0, 500),
          tokens: usage.totalTokens,
          creditCost: CREDIT_COSTS.generate,
        },
      });
    },
  });

  return result.toTextStreamResponse();
}
