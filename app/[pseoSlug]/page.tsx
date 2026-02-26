import { notFound } from "next/navigation";
import { PseoPageView } from "@/components/pseo/pseo-page-view";
import { buildPseoMetadata } from "@/lib/pseo/render";
import { getPseoPageByRoute } from "@/lib/pseo/service";
import { parseTopLevelPseoSlug } from "@/lib/pseo/slug-utils";

export const revalidate = 60 * 60 * 24;
export const dynamicParams = true;

async function loadPage(slug: string) {
  const parsed = parseTopLevelPseoSlug(slug);
  if (!parsed) return null;
  return getPseoPageByRoute(parsed);
}

export async function generateMetadata({
  params,
}: {
  params: { pseoSlug: string };
}) {
  const page = await loadPage(params.pseoSlug);
  if (!page) {
    return {
      title: "Not Found | AyoMagic",
      robots: { index: false, follow: true },
    };
  }

  return buildPseoMetadata(page);
}

export default async function TopLevelPseoPage({
  params,
}: {
  params: { pseoSlug: string };
}) {
  const page = await loadPage(params.pseoSlug);
  if (!page) notFound();

  return <PseoPageView page={page} />;
}

