import Link from "next/link";
import { GeneratedPageType } from "@prisma/client";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { listPseoHubTemplates } from "@/lib/pseo/service";
import { getPseoRenderData } from "@/lib/pseo/render";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "AI Templates (50+ Generators, Examples & Prompts) | AyoMagic",
  description:
    "Explore AI template pages for blog posts, emails, ads, social posts, product descriptions, and more with examples and model comparisons.",
};

export default async function AiTemplatesIndexPage() {
  const pages = await listPseoHubTemplates({ limit: 200 });

  return (
    <div className="mx-auto max-w-6xl space-y-8 px-4 py-10 sm:px-6">
      <div className="space-y-3">
        <Badge variant="outline">Programmatic SEO Hub</Badge>
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
          AI Templates & Generators
        </h1>
        <p className="max-w-3xl text-muted-foreground">
          Browse template guides, examples, and model comparisons for creators and marketers.
          Each page includes prompt ideas, sample output, and a direct CTA into AyoMagic.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {pages.map((page) => {
          const render = getPseoRenderData(page);
          return (
            <Card key={page.id} className="h-full">
              <CardHeader className="space-y-2">
                <div className="flex flex-wrap gap-2 text-xs">
                  <Badge variant="outline">{page.template.category}</Badge>
                  {page.hitCount > 0 ? <Badge>{page.hitCount} hits</Badge> : null}
                </div>
                <CardTitle className="text-lg leading-tight">
                  <Link href={render.path} className="hover:underline">
                    {render.content.h1}
                  </Link>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  {render.content.description}
                </p>
                <Link
                  href={render.path}
                  className="text-sm font-medium text-primary hover:underline"
                >
                  Open guide
                </Link>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

