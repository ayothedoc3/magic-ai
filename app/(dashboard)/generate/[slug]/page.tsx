import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { getTemplateBySlug } from "@/actions/generate";
import { getUserCredits } from "@/lib/credits";
import { GenerateClient } from "./generate-client";

type Props = {
  params: { slug: string };
};

export default async function GenerateTemplatePage({ params }: Props) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const [template, credits] = await Promise.all([
    getTemplateBySlug(params.slug),
    getUserCredits(session.user.id),
  ]);

  if (!template) notFound();

  const fields = Array.isArray(template.fields) ? template.fields : [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">{template.name}</h1>
        {template.description && (
          <p className="mt-1 text-muted-foreground">{template.description}</p>
        )}
      </div>

      <GenerateClient
        templateSlug={template.slug}
        templateId={template.id}
        fields={fields as { name: string; label: string; type: "text" | "textarea" | "select"; placeholder?: string; required?: boolean; options?: string[] }[]}
        credits={credits.text}
      />
    </div>
  );
}
