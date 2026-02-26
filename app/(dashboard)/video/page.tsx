import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getVideoHistory } from "@/actions/video";
import { getUserCredits } from "@/lib/credits";
import { VideoClient } from "@/components/video/video-client";

export default async function VideoPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const [videos, credits] = await Promise.all([
    getVideoHistory(),
    getUserCredits(session.user.id),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Video Generation</h1>
        <p className="text-muted-foreground">
          Create AI-generated videos with text prompts
        </p>
      </div>
      <VideoClient videos={videos} credits={credits.video} />
    </div>
  );
}
