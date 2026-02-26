import { createHash } from "crypto";
import { GeneratedPageType } from "@prisma/client";

type JsonPrimitive = string | number | boolean | null;
type JsonLike = JsonPrimitive | JsonLike[] | { [key: string]: JsonLike };

export function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

export function humanizeSlug(slug: string) {
  return slug
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function sortObjectKeys(value: JsonLike): JsonLike {
  if (Array.isArray(value)) {
    return value.map((item) => sortObjectKeys(item as JsonLike));
  }

  if (value && typeof value === "object") {
    return Object.keys(value)
      .sort()
      .reduce<Record<string, JsonLike>>((acc, key) => {
        acc[key] = sortObjectKeys((value as Record<string, JsonLike>)[key]);
        return acc;
      }, {});
  }

  return value;
}

export function canonicalizeVariantJson(
  variant: Record<string, unknown> | null | undefined
) {
  const normalized = (variant ?? {}) as Record<string, JsonLike>;
  return JSON.stringify(sortObjectKeys(normalized));
}

export function hashVariantJson(
  variant: Record<string, unknown> | null | undefined
) {
  return createHash("sha256")
    .update(canonicalizeVariantJson(variant))
    .digest("hex");
}

export function getTemplateSeoBaseSlug(templateSlug: string) {
  const normalized = slugify(templateSlug);
  if (
    normalized.endsWith("-generator") ||
    normalized.endsWith("-writer") ||
    normalized.endsWith("-creator")
  ) {
    return normalized;
  }
  return `${normalized}-generator`;
}

export function buildGeneratedPageSlug(params: {
  pageType: GeneratedPageType;
  templateSlug: string;
  variant?: Record<string, unknown> | null;
}) {
  const baseGeneratorSlug = getTemplateSeoBaseSlug(params.templateSlug);
  const rawTemplateSlug = slugify(params.templateSlug);
  const variant = params.variant ?? {};

  switch (params.pageType) {
    case GeneratedPageType.TEMPLATE:
      return baseGeneratorSlug;
    case GeneratedPageType.TOOL_EXAMPLES: {
      const override = typeof variant.toolSlug === "string" ? variant.toolSlug : null;
      return slugify(override ?? `${baseGeneratorSlug}-examples`);
    }
    case GeneratedPageType.GENERATED_EXAMPLE: {
      const niche =
        typeof variant.niche === "string" && variant.niche.trim()
          ? slugify(variant.niche)
          : "examples";
      return `${rawTemplateSlug}-for-${niche}`;
    }
    case GeneratedPageType.BEST_AI_2026: {
      const contentType =
        typeof variant.contentType === "string" && variant.contentType.trim()
          ? slugify(variant.contentType)
          : rawTemplateSlug;
      return `best-ai-for-${contentType}-2026`;
    }
    case GeneratedPageType.DALLE_PROMPTS: {
      const category =
        typeof variant.category === "string" && variant.category.trim()
          ? slugify(variant.category)
          : rawTemplateSlug;
      return `dall-e-prompts-for-${category}`;
    }
    default:
      return baseGeneratorSlug;
  }
}

export function buildGeneratedPagePath(params: {
  pageType: GeneratedPageType;
  slug: string;
}) {
  switch (params.pageType) {
    case GeneratedPageType.TEMPLATE:
      return `/ai-templates/${params.slug}`;
    case GeneratedPageType.TOOL_EXAMPLES:
      return `/ai-tools/${params.slug}`;
    case GeneratedPageType.GENERATED_EXAMPLE:
      return `/ai-generated-examples/${params.slug}`;
    case GeneratedPageType.BEST_AI_2026:
    case GeneratedPageType.DALLE_PROMPTS:
      return `/${params.slug}`;
    default:
      return `/ai-templates/${params.slug}`;
  }
}

export function parseTopLevelPseoSlug(slug: string) {
  if (/^best-ai-for-[a-z0-9-]+-2026$/.test(slug)) {
    return { pageType: GeneratedPageType.BEST_AI_2026, slug };
  }

  if (/^dall-e-prompts-for-[a-z0-9-]+$/.test(slug)) {
    return { pageType: GeneratedPageType.DALLE_PROMPTS, slug };
  }

  return null;
}

