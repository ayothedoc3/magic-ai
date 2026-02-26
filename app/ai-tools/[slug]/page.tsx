import { notFound } from "next/navigation";
import { GeneratedPageType } from "@prisma/client";
import { PseoPageView } from "@/components/pseo/pseo-page-view";
import { buildPseoMetadata } from "@/lib/pseo/render";
import { getPseoPageByRoute } from "@/lib/pseo/service";

export const revalidate = 60 * 60 * 24;
export const dynamicParams = true;

async function loadPage(slug: string) {
  return getPseoPageByRoute({ pageType: GeneratedPageType.TOOL_EXAMPLES, slug });
}

export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}) {
  const page = await loadPage(params.slug);
  if (!page) {
    return {
      title: "AI Tool Examples Not Found | AyoMagic",
      robots: { index: false, follow: true },
    };
  }

  return buildPseoMetadata(page);
}

export default async function AiToolExamplesPage({
  params,
}: {
  params: { slug: string };
}) {
  const page = await loadPage(params.slug);
  if (!page) notFound();

  return <PseoPageView page={page} />;
}

