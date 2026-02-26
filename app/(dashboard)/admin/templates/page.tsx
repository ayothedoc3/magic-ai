import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  formatDateTime,
  getJsonArrayLength,
  requireAdminSession,
} from "@/lib/admin";
import { prisma } from "@/lib/prisma";

export default async function AdminTemplatesPage() {
  await requireAdminSession();

  const templates = await prisma.template.findMany({
    orderBy: [{ active: "desc" }, { updatedAt: "desc" }],
    select: {
      id: true,
      name: true,
      slug: true,
      description: true,
      category: true,
      icon: true,
      prompt: true,
      fields: true,
      active: true,
      builtIn: true,
      updatedAt: true,
      _count: {
        select: {
          documents: true,
        },
      },
    },
  });

  const activeTemplates = templates.filter((template) => template.active).length;
  const builtInTemplates = templates.filter((template) => template.builtIn).length;
  const categoryCount = new Set(templates.map((template) => template.category)).size;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Templates</h1>
        <p className="text-muted-foreground">
          Prompt template catalog for generation workflows.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Templates</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{templates.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Active</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeTemplates}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Categories</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{categoryCount}</div>
            <p className="text-xs text-muted-foreground">
              {builtInTemplates} built-in template(s)
            </p>
          </CardContent>
        </Card>
      </div>

      {templates.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>No templates found</CardTitle>
            <CardDescription>
              Seed the default template catalog or create templates before launch.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          {templates.map((template) => {
            const fieldCount = getJsonArrayLength(template.fields);
            const promptPreview =
              template.prompt.length > 220
                ? `${template.prompt.slice(0, 220)}...`
                : template.prompt;

            return (
              <Card key={template.id}>
                <CardHeader>
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <CardTitle className="text-xl">{template.name}</CardTitle>
                      <CardDescription>
                        {template.description ?? "No description"}
                      </CardDescription>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Badge variant={template.active ? "default" : "secondary"}>
                        {template.active ? "Active" : "Inactive"}
                      </Badge>
                      <Badge variant="outline">{template.category}</Badge>
                      {template.builtIn && <Badge variant="secondary">Built-in</Badge>}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4 text-sm">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-md border p-3">
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">
                        Identity
                      </p>
                      <p className="mt-1 text-sm font-medium">{template.slug}</p>
                      <p className="text-xs text-muted-foreground">
                        Icon: {template.icon ?? "None"}
                      </p>
                    </div>
                    <div className="rounded-md border p-3">
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">
                        Usage
                      </p>
                      <p className="mt-1 text-sm">
                        Fields: {fieldCount.toLocaleString()}
                      </p>
                      <p className="text-sm">
                        Documents: {template._count.documents.toLocaleString()}
                      </p>
                    </div>
                  </div>

                  <div className="rounded-md border p-3">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">
                      Prompt Preview
                    </p>
                    <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">
                      {promptPreview}
                    </p>
                  </div>

                  <div className="text-xs text-muted-foreground">
                    Updated: {formatDateTime(template.updatedAt)}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
