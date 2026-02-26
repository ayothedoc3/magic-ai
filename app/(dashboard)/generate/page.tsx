import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Wand2 } from "lucide-react";
import { getTemplates, getTemplateCategories } from "@/actions/generate";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type Props = {
  searchParams: { category?: string };
};

export default async function GeneratePage({ searchParams }: Props) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const [templates, categories] = await Promise.all([
    getTemplates(searchParams.category),
    getTemplateCategories(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Generate Content</h1>
        <p className="text-muted-foreground">
          Choose a template and generate AI-powered content
        </p>
      </div>

      {/* Category tabs */}
      {categories.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <Link href="/generate">
            <Badge
              variant={!searchParams.category ? "default" : "outline"}
              className="cursor-pointer"
            >
              All
            </Badge>
          </Link>
          {categories.map((cat) => (
            <Link key={cat} href={`/generate?category=${encodeURIComponent(cat)}`}>
              <Badge
                variant={searchParams.category === cat ? "default" : "outline"}
                className="cursor-pointer"
              >
                {cat}
              </Badge>
            </Link>
          ))}
        </div>
      )}

      {/* Template grid */}
      {templates.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Wand2 className="mb-4 h-12 w-12 text-muted-foreground/50" />
            <h3 className="mb-1 text-lg font-medium">No templates found</h3>
            <p className="text-sm text-muted-foreground">
              {searchParams.category
                ? "No templates in this category. Try another category."
                : "Templates will appear here once added by an admin."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {templates.map((template) => (
            <Link key={template.id} href={`/generate/${template.slug}`}>
              <Card className="h-full transition-colors hover:bg-muted/50">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-base">{template.name}</CardTitle>
                    <Badge variant="secondary" className="text-xs">
                      {template.category}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {template.description || "Generate content using this template"}
                  </p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
