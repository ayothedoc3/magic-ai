import { GeneratedPageType, type Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  POPULAR_IMAGE_PROMPT_CATEGORIES,
  buildTemplatePseoDefaults,
  pickPopularNichesForTemplate,
} from "@/lib/pseo/content";
import {
  buildGeneratedPagePath,
  buildGeneratedPageSlug,
  getTemplateSeoBaseSlug,
  hashVariantJson,
} from "@/lib/pseo/slug-utils";

const TEMPLATE_PSEO_SELECT = {
  id: true,
  slug: true,
  name: true,
  description: true,
  category: true,
  prompt: true,
  fields: true,
  examplePrompt: true,
  sampleInput: true,
  sampleOutput: true,
  supportedModels: true,
  active: true,
} satisfies Prisma.TemplateSelect;

const GENERATED_PAGE_SELECT = {
  id: true,
  slug: true,
  pageType: true,
  variantJson: true,
  variantHash: true,
  hitCount: true,
  published: true,
  createdAt: true,
  updatedAt: true,
  lastHitAt: true,
  templateId: true,
  template: {
    select: TEMPLATE_PSEO_SELECT,
  },
} satisfies Prisma.GeneratedPageSelect;

function hasDatabaseUrl() {
  return Boolean(process.env.DATABASE_URL?.trim());
}

function toInputJson(
  value: Record<string, unknown> | Prisma.JsonValue | null | undefined
): Prisma.InputJsonValue | undefined {
  if (value == null) return undefined;
  return value as Prisma.InputJsonValue;
}

export type PseoPageRecord = Prisma.GeneratedPageGetPayload<{
  select: typeof GENERATED_PAGE_SELECT;
}>;

function isMissingTemplatePseoFields(template: {
  examplePrompt: string | null;
  sampleInput: Prisma.JsonValue | null;
  sampleOutput: Prisma.JsonValue | null;
  supportedModels: string[];
}) {
  return (
    !template.examplePrompt ||
    !template.sampleInput ||
    !template.sampleOutput ||
    !Array.isArray(template.supportedModels) ||
    template.supportedModels.length === 0
  );
}

async function backfillTemplatePseoFields(template: {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  category: string;
  prompt: string;
  fields: Prisma.JsonValue;
  examplePrompt: string | null;
  sampleInput: Prisma.JsonValue | null;
  sampleOutput: Prisma.JsonValue | null;
  supportedModels: string[];
}) {
  if (!isMissingTemplatePseoFields(template)) {
    return false;
  }

  const defaults = buildTemplatePseoDefaults(template);

  await prisma.template.update({
    where: { id: template.id },
    data: {
      examplePrompt: template.examplePrompt ?? defaults.examplePrompt,
      sampleInput: toInputJson(template.sampleInput ?? defaults.sampleInput),
      sampleOutput: toInputJson(template.sampleOutput ?? defaults.sampleOutput),
      supportedModels:
        Array.isArray(template.supportedModels) && template.supportedModels.length > 0
          ? template.supportedModels
          : defaults.supportedModels,
    },
  });

  return true;
}

function buildSeedCandidatesForTemplate(template: {
  id: string;
  slug: string;
  name: string;
  category: string;
}) {
  const candidates: Array<{
    pageType: GeneratedPageType;
    slug: string;
    variantJson: Record<string, unknown>;
  }> = [];

  candidates.push({
    pageType: GeneratedPageType.TEMPLATE,
    slug: buildGeneratedPageSlug({
      pageType: GeneratedPageType.TEMPLATE,
      templateSlug: template.slug,
    }),
    variantJson: {},
  });

  candidates.push({
    pageType: GeneratedPageType.TOOL_EXAMPLES,
    slug: buildGeneratedPageSlug({
      pageType: GeneratedPageType.TOOL_EXAMPLES,
      templateSlug: template.slug,
      variant: {},
    }),
    variantJson: {},
  });

  if (template.slug.includes("social") || template.name.toLowerCase().includes("social")) {
    candidates.push({
      pageType: GeneratedPageType.TOOL_EXAMPLES,
      slug: buildGeneratedPageSlug({
        pageType: GeneratedPageType.TOOL_EXAMPLES,
        templateSlug: template.slug,
        variant: { toolSlug: "tweet-generator-examples", platform: "Twitter/X" },
      }),
      variantJson: { toolSlug: "tweet-generator-examples", platform: "Twitter/X" },
    });

    candidates.push({
      pageType: GeneratedPageType.BEST_AI_2026,
      slug: buildGeneratedPageSlug({
        pageType: GeneratedPageType.BEST_AI_2026,
        templateSlug: template.slug,
        variant: { contentType: "social-media-captions" },
      }),
      variantJson: { contentType: "social-media-captions" },
    });
  }

  if (template.slug.includes("product-description")) {
    candidates.push({
      pageType: GeneratedPageType.BEST_AI_2026,
      slug: buildGeneratedPageSlug({
        pageType: GeneratedPageType.BEST_AI_2026,
        templateSlug: template.slug,
        variant: { contentType: "ad-copy" },
      }),
      variantJson: { contentType: "ad-copy" },
    });
  }

  candidates.push({
    pageType: GeneratedPageType.BEST_AI_2026,
    slug: buildGeneratedPageSlug({
      pageType: GeneratedPageType.BEST_AI_2026,
      templateSlug: template.slug,
      variant: { contentType: getTemplateSeoBaseSlug(template.slug).replace(/-generator$/, "") },
    }),
    variantJson: {
      contentType: getTemplateSeoBaseSlug(template.slug).replace(/-generator$/, ""),
    },
  });

  for (const niche of pickPopularNichesForTemplate(template)) {
    candidates.push({
      pageType: GeneratedPageType.GENERATED_EXAMPLE,
      slug: buildGeneratedPageSlug({
        pageType: GeneratedPageType.GENERATED_EXAMPLE,
        templateSlug: template.slug,
        variant: { niche },
      }),
      variantJson: { niche },
    });
  }

  if (template.category === "image" || template.slug.includes("image")) {
    for (const category of POPULAR_IMAGE_PROMPT_CATEGORIES.slice(0, 4)) {
      candidates.push({
        pageType: GeneratedPageType.DALLE_PROMPTS,
        slug: buildGeneratedPageSlug({
          pageType: GeneratedPageType.DALLE_PROMPTS,
          templateSlug: template.slug,
          variant: { category },
        }),
        variantJson: { category },
      });
    }
  }

  return candidates;
}

export async function preseedPseoPages(params?: {
  templateLimit?: number;
  publish?: boolean;
}) {
  if (!hasDatabaseUrl()) {
    return {
      templatesProcessed: 0,
      backfilledTemplates: 0,
      createdPages: 0,
      updatedPages: 0,
      totalProcessed: 0,
      skipped: true,
      reason: "DATABASE_URL is not configured",
    };
  }

  const templates = await prisma.template.findMany({
    where: { active: true },
    orderBy: [{ category: "asc" }, { name: "asc" }],
    take: params?.templateLimit,
    select: {
      id: true,
      slug: true,
      name: true,
      description: true,
      category: true,
      prompt: true,
      fields: true,
      examplePrompt: true,
      sampleInput: true,
      sampleOutput: true,
      supportedModels: true,
    },
  });

  let backfilledTemplates = 0;
  let createdPages = 0;
  let updatedPages = 0;

  for (const template of templates) {
    const backfilled = await backfillTemplatePseoFields(template);
    if (backfilled) backfilledTemplates += 1;

    const candidates = buildSeedCandidatesForTemplate(template);
    for (const candidate of candidates) {
      const variantHash = hashVariantJson(candidate.variantJson);
      const existing = await prisma.generatedPage.findUnique({
        where: {
          templateId_pageType_variantHash: {
            templateId: template.id,
            pageType: candidate.pageType,
            variantHash,
          },
        },
        select: { id: true },
      });

      if (existing) {
        await prisma.generatedPage.update({
          where: { id: existing.id },
          data: {
            slug: candidate.slug,
            published: params?.publish ?? true,
            variantJson: toInputJson(candidate.variantJson),
          },
        });
        updatedPages += 1;
      } else {
        await prisma.generatedPage.create({
          data: {
            templateId: template.id,
            pageType: candidate.pageType,
            slug: candidate.slug,
            variantJson: toInputJson(candidate.variantJson),
            variantHash,
            published: params?.publish ?? true,
          },
        });
        createdPages += 1;
      }
    }
  }

  return {
    templatesProcessed: templates.length,
    backfilledTemplates,
    createdPages,
    updatedPages,
    totalProcessed: createdPages + updatedPages,
  };
}

export async function getPseoPageByRoute(params: {
  pageType: GeneratedPageType;
  slug: string;
}) {
  if (!hasDatabaseUrl()) {
    return null;
  }

  const page = await prisma.generatedPage.findFirst({
    where: {
      slug: params.slug,
      pageType: params.pageType,
      published: true,
      template: {
        active: true,
      },
    },
    select: GENERATED_PAGE_SELECT,
  });

  if (page) return page;

  if (params.pageType !== GeneratedPageType.TEMPLATE) {
    return null;
  }

  // Fallback: resolve directly from existing Template slug and lazily create the pSEO record.
  const rawTemplateSlug = params.slug.replace(/-generator$/, "");
  const template = await prisma.template.findFirst({
    where: {
      active: true,
      OR: [{ slug: rawTemplateSlug }, { slug: params.slug }],
    },
    select: {
      id: true,
      slug: true,
      name: true,
      description: true,
      category: true,
      prompt: true,
      fields: true,
      examplePrompt: true,
      sampleInput: true,
      sampleOutput: true,
      supportedModels: true,
    },
  });

  if (!template) return null;

  const upserted = await upsertGeneratedVariantPage({
    templateId: template.id,
    templateSlug: template.slug,
    pageType: GeneratedPageType.TEMPLATE,
    variantJson: {},
  });

  return prisma.generatedPage.findUnique({
    where: { id: upserted.id },
    select: GENERATED_PAGE_SELECT,
  });
}

export async function upsertGeneratedVariantPage(params: {
  templateId: string;
  templateSlug: string;
  pageType: GeneratedPageType;
  variantJson?: Record<string, unknown>;
  slugOverride?: string;
  published?: boolean;
}) {
  if (!hasDatabaseUrl()) {
    throw new Error("DATABASE_URL is not configured");
  }

  const variantJson = params.variantJson ?? {};
  const variantHash = hashVariantJson(variantJson);
  const slug =
    params.slugOverride ??
    buildGeneratedPageSlug({
      pageType: params.pageType,
      templateSlug: params.templateSlug,
      variant: variantJson,
    });

  return prisma.generatedPage.upsert({
    where: {
      templateId_pageType_variantHash: {
        templateId: params.templateId,
        pageType: params.pageType,
        variantHash,
      },
    },
    create: {
      templateId: params.templateId,
      pageType: params.pageType,
      slug,
      // Cast because Prisma narrows JSON writes to InputJsonValue.
      variantJson: toInputJson(variantJson),
      variantHash,
      published: params.published ?? true,
    },
    update: {
      slug,
      published: params.published ?? true,
      variantJson: toInputJson(variantJson),
    },
    select: {
      id: true,
      slug: true,
      pageType: true,
      templateId: true,
      variantHash: true,
    },
  });
}

export async function incrementGeneratedPageHit(params: {
  pageId?: string;
  slug?: string;
  pageType?: GeneratedPageType;
}) {
  if (!hasDatabaseUrl()) {
    return false;
  }

  const pageId = params.pageId?.trim();
  if (pageId) {
    await prisma.generatedPage.update({
      where: { id: pageId },
      data: {
        hitCount: { increment: 1 },
        lastHitAt: new Date(),
      },
    });
    return true;
  }

  const slug = params.slug?.trim();
  const pageType = params.pageType;
  if (slug && pageType) {
    await prisma.generatedPage.updateMany({
      where: { slug, pageType },
      data: {
        hitCount: { increment: 1 },
        lastHitAt: new Date(),
      },
    });
    return true;
  }

  return false;
}

export async function listPseoPagesForSitemap(params?: {
  limit?: number;
  hitThreshold?: number;
}) {
  if (!hasDatabaseUrl()) {
    return [];
  }

  const limit = params?.limit ?? 5000;
  const hitThreshold = params?.hitThreshold ?? 0;

  return prisma.generatedPage.findMany({
    where: {
      published: true,
      template: { active: true },
      hitCount: { gte: hitThreshold },
    },
    orderBy: [{ hitCount: "desc" }, { updatedAt: "desc" }],
    take: limit,
    select: {
      slug: true,
      pageType: true,
      hitCount: true,
      createdAt: true,
      updatedAt: true,
      lastHitAt: true,
    },
  });
}

export async function listPseoHubTemplates(params?: { limit?: number }) {
  if (!hasDatabaseUrl()) {
    return [];
  }

  return prisma.generatedPage.findMany({
    where: {
      pageType: GeneratedPageType.TEMPLATE,
      published: true,
      template: { active: true },
    },
    orderBy: [{ hitCount: "desc" }, { createdAt: "asc" }],
    take: params?.limit ?? 200,
    select: GENERATED_PAGE_SELECT,
  });
}

export async function listPseoPagesByType(params: {
  pageType: GeneratedPageType;
  limit?: number;
}) {
  if (!hasDatabaseUrl()) {
    return [];
  }

  return prisma.generatedPage.findMany({
    where: {
      pageType: params.pageType,
      published: true,
      template: { active: true },
    },
    orderBy: [{ hitCount: "desc" }, { createdAt: "asc" }],
    take: params.limit ?? 200,
    select: GENERATED_PAGE_SELECT,
  });
}

export function getPseoPagePath(page: Pick<PseoPageRecord, "pageType" | "slug">) {
  return buildGeneratedPagePath({ pageType: page.pageType, slug: page.slug });
}
