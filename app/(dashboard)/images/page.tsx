import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getImageHistory } from "@/actions/images";
import { getUserCredits } from "@/lib/credits";
import { ImagesClient } from "@/components/images/images-client";

export default async function ImagesPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const [images, credits] = await Promise.all([
    getImageHistory(),
    getUserCredits(session.user.id),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Image Generation</h1>
        <p className="text-muted-foreground">
          Create images with DALL-E 3
        </p>
      </div>
      <ImagesClient images={images} credits={credits.image} />
    </div>
  );
}
