import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PseoHitTracker } from "@/components/pseo/pseo-hit-tracker";
import { PseoShareExamplePanel } from "@/components/pseo/pseo-share-example-panel";
import { APP_NAME } from "@/lib/constants";
import type { PseoPageRecord } from "@/lib/pseo/service";
import { getPseoRenderData } from "@/lib/pseo/render";

export function PseoPageView({ page }: { page: PseoPageRecord }) {
  const { path, content } = getPseoRenderData(page);
  const variant =
    page.variantJson && typeof page.variantJson === "object" && !Array.isArray(page.variantJson)
      ? (page.variantJson as Record<string, unknown>)
      : {};
  const defaultNiche = typeof variant.niche === "string" ? variant.niche : undefined;
  const defaultTone = typeof variant.tone === "string" ? variant.tone : undefined;
  const defaultPlatform =
    typeof variant.platform === "string" ? variant.platform : undefined;

  return (
    <div className="mx-auto max-w-5xl space-y-8 px-4 py-10 sm:px-6">
      <PseoHitTracker pageId={page.id} slug={page.slug} pageType={page.pageType} />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(content.softwareJsonLd),
        }}
      />

      <div className="space-y-4">
        <nav className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          {content.breadcrumbs.map((crumb, index) => (
            <span key={`${crumb.href}-${index}`} className="flex items-center gap-2">
              {index > 0 ? <span>/</span> : null}
              {index === content.breadcrumbs.length - 1 ? (
                <span>{crumb.label}</span>
              ) : (
                <Link href={crumb.href} className="hover:text-foreground">
                  {crumb.label}
                </Link>
              )}
            </span>
          ))}
        </nav>

        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="rounded-full border px-2 py-1 text-muted-foreground">
            {page.pageType}
          </span>
          <span className="rounded-full border px-2 py-1 text-muted-foreground">
            {page.template.category}
          </span>
          <span className="rounded-full border px-2 py-1 text-muted-foreground">
            {page.template.supportedModels.length || 3}+ models
          </span>
        </div>

        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{content.h1}</h1>
        <p className="max-w-3xl text-muted-foreground">{content.pageIntro}</p>

        <div className="flex flex-wrap items-center gap-3">
          <Button asChild>
            <Link href={content.cta.href}>{content.cta.label}</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href={content.cta.secondaryHref}>Sign In</Link>
          </Button>
          <span className="text-xs text-muted-foreground">{content.cta.subLabel}</span>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.3fr_0.7fr]">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Example Prompt</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="whitespace-pre-wrap rounded-md border bg-muted/40 p-4 text-sm">
              {content.examplePrompt}
            </pre>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Use This In AyoMagic</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>Open the template, customize the input, and compare GPT-4o, Claude, or Gemini outputs in one place.</p>
            <div className="rounded-md border border-dashed p-3">
              Fast responses - multi-model chat - editor + templates - free tier
            </div>
            <Button asChild className="w-full">
              <Link href="/register">Start Free</Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Sample Input</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="max-h-[420px] overflow-auto whitespace-pre-wrap rounded-md border bg-muted/40 p-4 text-xs sm:text-sm">
              {content.sampleInputText}
            </pre>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Sample Output</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="max-h-[420px] overflow-auto whitespace-pre-wrap rounded-md border bg-muted/40 p-4 text-xs sm:text-sm">
              {content.sampleOutputText}
            </pre>
          </CardContent>
        </Card>
      </div>

      <PseoShareExamplePanel
        templateId={page.template.id}
        templateName={page.template.name}
        sourceSlug={page.slug}
        currentPageType={page.pageType}
        defaultNiche={defaultNiche}
        defaultTone={defaultTone}
        defaultPlatform={defaultPlatform}
        sampleInputText={content.sampleInputText}
        sampleOutputText={content.sampleOutputText}
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">How To Get Better Results</CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="space-y-3 text-sm">
              {content.howToSteps.map((step, index) => (
                <li key={step} className="flex gap-3">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground">
                    {index + 1}
                  </span>
                  <span className="text-muted-foreground">{step}</span>
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Practical Tips</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm text-muted-foreground">
              {content.tips.map((tip) => (
                <li key={tip} className="rounded-md border p-3">
                  {tip}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            Model Comparison: GPT-4o vs Claude vs Gemini
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="border-b text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="py-3 pr-4 font-medium">Model</th>
                  <th className="py-3 pr-4 font-medium">Provider</th>
                  <th className="py-3 pr-4 font-medium">Best For</th>
                  <th className="py-3 font-medium">Watch Out For</th>
                </tr>
              </thead>
              <tbody>
                {content.comparisonRows.map((row) => (
                  <tr key={row.key} className="border-b align-top last:border-0">
                    <td className="py-3 pr-4 font-medium">{row.name}</td>
                    <td className="py-3 pr-4 capitalize text-muted-foreground">
                      {row.provider}
                    </td>
                    <td className="py-3 pr-4 text-muted-foreground">{row.bestFor}</td>
                    <td className="py-3 text-muted-foreground">{row.caution}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">FAQ</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {content.faq.map((item) => (
            <div key={item.question} className="rounded-md border p-4">
              <h2 className="text-sm font-semibold">{item.question}</h2>
              <p className="mt-2 text-sm text-muted-foreground">{item.answer}</p>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Ready To Use The Tool?</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-medium">{content.h1}</p>
            <p className="text-sm text-muted-foreground">
              Launch the template inside {APP_NAME} and compare outputs instantly.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button asChild>
              <Link href="/register">Try Free</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href={path}>Share URL</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
