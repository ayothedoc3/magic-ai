import Link from "next/link";
import { GeneratedPageType } from "@prisma/client";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { listPseoPagesByType } from "@/lib/pseo/service";
import { getPseoRenderData } from "@/lib/pseo/render";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "AI Generated Examples by Niche | AyoMagic",
  description:
    "See AI-generated content examples by niche (fitness, ecommerce, SaaS, real estate, and more) with prompts, outputs, and tips.",
};

export default async function AiGeneratedExamplesIndexPage() {
  const pages = await listPseoPagesByType({
    pageType: GeneratedPageType.GENERATED_EXAMPLE,
    limit: 300,
  });

  return (
    <div className="mx-auto max-w-6xl space-y-8 px-4 py-10 sm:px-6">
      <div className="space-y-3">
        <Badge variant="outline">Examples by Niche</Badge>
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
          AI-Generated Examples For Real Niches
        </h1>
        <p className="max-w-3xl text-muted-foreground">
          Browse niche-specific examples like product descriptions for ecommerce, social captions for fitness, and email drafts for SaaS.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {pages.map((page) => {
          const render = getPseoRenderData(page);
          return (
            <Card key={page.id}>
              <CardHeader>
                <div className="mb-2 flex flex-wrap gap-2">
                  <Badge variant="outline">{page.template.category}</Badge>
                  {page.hitCount > 0 ? (
                    <Badge variant="secondary">{page.hitCount} views</Badge>
                  ) : null}
                </div>
                <CardTitle className="text-lg">
                  <Link href={render.path} className="hover:underline">
                    {render.content.h1}
                  </Link>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  {render.content.description}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

