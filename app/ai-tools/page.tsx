import Link from "next/link";
import { GeneratedPageType } from "@prisma/client";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { listPseoPagesByType } from "@/lib/pseo/service";
import { getPseoRenderData } from "@/lib/pseo/render";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "AI Tool Examples (Tweets, Emails, Ads, Blogs) | AyoMagic",
  description:
    "Examples and prompt ideas for AyoMagic AI tools including social posts, emails, ads, and long-form content generators.",
};

export default async function AiToolsIndexPage() {
  const pages = await listPseoPagesByType({
    pageType: GeneratedPageType.TOOL_EXAMPLES,
    limit: 300,
  });

  return (
    <div className="mx-auto max-w-6xl space-y-8 px-4 py-10 sm:px-6">
      <div className="space-y-3">
        <Badge variant="outline">AI Tools</Badge>
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
          AI Tool Examples & Prompt Packs
        </h1>
        <p className="max-w-3xl text-muted-foreground">
          Find example-driven pages for tweet generators, email tools, ad copy helpers, and more.
          These pages are built to answer long-tail searches with practical examples.
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
                  <Badge variant="secondary">{page.pageType}</Badge>
                </div>
                <CardTitle className="text-lg">
                  <Link href={render.path} className="hover:underline">
                    {render.content.h1}
                  </Link>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  {render.content.pageIntro}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

