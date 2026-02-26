import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getVideoJobStatus } from "@/lib/video";

export async function GET(
  _req: Request,
  { params }: { params: { jobId: string } }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const job = await getVideoJobStatus(params.jobId);

    // If completed, update the generation record
    if (job.status === "succeeded" && job.output) {
      const videoUrl = typeof job.output === "string" ? job.output : null;
      if (videoUrl) {
        await prisma.generation.updateMany({
          where: {
            userId: session.user.id,
            type: "VIDEO",
            output: { contains: params.jobId },
          },
          data: {
            videoUrl,
            output: JSON.stringify({
              jobId: params.jobId,
              status: "succeeded",
            }),
          },
        });
      }
    } else if (job.status === "failed") {
      await prisma.generation.updateMany({
        where: {
          userId: session.user.id,
          type: "VIDEO",
          output: { contains: params.jobId },
        },
        data: {
          output: JSON.stringify({
            jobId: params.jobId,
            status: "failed",
            error: job.error,
          }),
        },
      });
    }

    return Response.json(job);
  } catch (error) {
    console.error("Video status error:", error);
    return Response.json(
      { error: error instanceof Error ? error.message : "Status check failed" },
      { status: 500 }
    );
  }
}
