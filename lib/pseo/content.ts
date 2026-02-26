import { GeneratedPageType, type Template } from "@prisma/client";
import { AI_MODELS, APP_DESCRIPTION, APP_NAME } from "@/lib/constants";
import { humanizeSlug, slugify } from "@/lib/pseo/slug-utils";

type JsonRecord = Record<string, unknown>;

export const DEFAULT_SUPPORTED_MODELS = [
  "gpt-4o",
  "gpt-4o-mini",
  "claude-3-5-sonnet-20241022",
  "gemini-1.5-pro",
];

export const POPULAR_NICHES = [
  "fitness",
  "ecommerce",
  "real-estate",
  "saas",
  "coaching",
  "fashion",
  "travel",
  "restaurants",
  "healthcare",
  "education",
];

export const POPULAR_IMAGE_PROMPT_CATEGORIES = [
  "product-images",
  "food-photography",
  "fashion-shoots",
  "app-screenshots",
  "saas-hero-images",
  "real-estate-listings",
];

export function pickPopularNichesForTemplate(template: Pick<Template, "category" | "slug">) {
  const key = `${template.category}-${template.slug}`.toLowerCase();

  if (key.includes("code")) {
    return ["api", "landing-page", "ecommerce-checkout"];
  }

  if (key.includes("email")) {
    return ["saas", "ecommerce", "real-estate"];
  }

  if (key.includes("social")) {
    return ["fitness", "personal-brand", "ecommerce"];
  }

  if (key.includes("seo")) {
    return ["saas", "local-business", "ecommerce"];
  }

  return POPULAR_NICHES.slice(0, 4);
}

export function getTemplateSupportedModels(template: Pick<Template, "supportedModels" | "category" | "slug">) {
  if (Array.isArray(template.supportedModels) && template.supportedModels.length > 0) {
    return template.supportedModels;
  }

  if (template.category === "code" || template.slug.includes("code")) {
    return ["gpt-4o", "claude-3-5-sonnet-20241022", "gpt-4o-mini"];
  }

  if (template.category === "image" || template.slug.includes("image")) {
    return ["gpt-4o", "gemini-1.5-pro"];
  }

  return DEFAULT_SUPPORTED_MODELS;
}

function getTemplateFocusKeyword(template: Pick<Template, "name" | "slug">) {
  const normalized = template.slug.toLowerCase();
  if (normalized.includes("social")) return "social media post";
  if (normalized.includes("seo-meta")) return "SEO meta tags";
  return template.name;
}

function stringifyJson(value: unknown) {
  if (typeof value === "string") return value;
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

function safeVariantText(value: unknown, maxLength: number) {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, maxLength) : undefined;
}

export function buildTemplatePseoDefaults(template: Pick<
  Template,
  "name" | "slug" | "description" | "category" | "prompt" | "fields"
>) {
  const sampleInput: JsonRecord = {};
  const fields = Array.isArray(template.fields) ? template.fields : [];

  for (const field of fields as JsonRecord[]) {
    const name = typeof field.name === "string" ? field.name : null;
    const label = typeof field.label === "string" ? field.label : name;
    const type = typeof field.type === "string" ? field.type : "text";
    const options = Array.isArray(field.options) ? field.options : [];

    if (!name) continue;

    if (type === "select" && options.length > 0 && typeof options[0] === "string") {
      sampleInput[name] = options[0];
      continue;
    }

    if (name.includes("topic")) sampleInput[name] = "How to use AI to create content faster";
    else if (name.includes("audience")) sampleInput[name] = "creators and marketers";
    else if (name.includes("tone")) sampleInput[name] = "Professional";
    else if (name.includes("platform")) sampleInput[name] = "Twitter/X";
    else if (name.includes("language")) sampleInput[name] = "TypeScript";
    else if (name.includes("product")) sampleInput[name] = "Wireless ergonomic keyboard";
    else if (name.includes("keywords")) sampleInput[name] = "AI content generator, marketing AI tools";
    else if (name.includes("description")) sampleInput[name] = "Generate a reusable utility for parsing campaign UTM params.";
    else if (name.includes("subject")) sampleInput[name] = "Launching a new AI workflow";
    else if (name.includes("cta")) sampleInput[name] = "Start your free trial";
    else sampleInput[name] = label ? `Example ${label}` : "Example value";
  }

  const sampleOutput =
    template.category === "code" || template.slug.includes("code")
      ? {
          title: "Parse UTM Parameters in TypeScript",
          code: "export function parseUtms(url: string) { /* example */ }",
          notes: ["Handles missing params", "Returns normalized keys"],
        }
      : {
          title: `${template.name} Example`,
          content:
            "This is a sample output block generated for SEO pages. It shows visitors what kind of result they can expect before they sign up.",
          bullets: [
            "Clear structure",
            "Fast draft quality",
            "Works with GPT-4o, Claude, and Gemini",
          ],
        };

  const examplePrompt =
    template.description ??
    `Use ${template.name} to create high-quality content faster with ${APP_NAME}.`;

  return {
    examplePrompt,
    sampleInput,
    sampleOutput,
    supportedModels: DEFAULT_SUPPORTED_MODELS,
  };
}

function deriveExampleVariant(template: Pick<Template, "name" | "slug" | "category">, variant: JsonRecord) {
  const niche =
    typeof variant.niche === "string" && variant.niche.trim()
      ? humanizeSlug(slugify(variant.niche))
      : null;

  if (!niche) return null;

  return {
    titleSuffix: `for ${niche}`,
    introSuffix: ` focused on the ${niche} niche`,
    niche,
  };
}

function getModelComparisonRows(modelKeys: string[]) {
  return modelKeys
    .map((key) => {
      const model = AI_MODELS[key as keyof typeof AI_MODELS];
      if (!model) return null;

      let bestFor = "Balanced drafting and iteration";
      let caution = "Verify facts and brand claims before publishing";

      if (model.provider === "openai") {
        bestFor = "Fast ideation, formatting, and general-purpose marketing drafts";
      } else if (model.provider === "anthropic") {
        bestFor = "Long-form structure, tone control, and editorial refinement";
      } else if (model.provider === "google") {
        bestFor = "Research-style summaries and multi-angle brainstorming";
      }

      return {
        key,
        name: model.name,
        provider: model.provider,
        bestFor,
        caution,
      };
    })
    .filter((row): row is NonNullable<typeof row> => Boolean(row));
}

export function buildPseoPageContent(params: {
  template: Pick<
    Template,
    | "id"
    | "name"
    | "slug"
    | "description"
    | "category"
    | "prompt"
    | "fields"
    | "examplePrompt"
    | "sampleInput"
    | "sampleOutput"
    | "supportedModels"
  >;
  pageType: GeneratedPageType;
  path: string;
  variant?: JsonRecord | null;
}) {
  const { template, pageType, path } = params;
  const variant = (params.variant ?? {}) as JsonRecord;
  const supportedModels = getTemplateSupportedModels(template);
  const comparisonRows = getModelComparisonRows(supportedModels);
  const variantMeta = deriveExampleVariant(template, variant);
  const contentTypeLabel = getTemplateFocusKeyword(template);
  const templateDisplay = template.name;
  const year = "2026";

  let h1 = `${templateDisplay} AI Template`;
  let title = `${templateDisplay} Generator | ${APP_NAME} (${comparisonRows
    .slice(0, 2)
    .map((row) => row.name)
    .join(" & ")})`;
  let description =
    template.description ||
    `${APP_NAME} helps creators and marketers generate ${contentTypeLabel} drafts with GPT-4o, Claude, and Gemini.`;
  let pageIntro = `Use this ${templateDisplay.toLowerCase()} page to see example prompts, outputs, and model recommendations before using ${APP_NAME}.`;
  let keywords = [
    `${templateDisplay} generator`,
    `AI ${contentTypeLabel}`,
    `free ${templateDisplay.toLowerCase()} generator`,
  ];

  if (pageType === GeneratedPageType.TOOL_EXAMPLES) {
    h1 = `${templateDisplay} Examples (${year})`;
    title = `${templateDisplay} Examples & Prompts | ${APP_NAME}`;
    pageIntro = `Browse curated ${templateDisplay.toLowerCase()} examples, input ideas, and ready-to-adapt outputs for creators and marketers.`;
    keywords = [`${templateDisplay} examples`, `AI ${contentTypeLabel} examples`, `${contentTypeLabel} prompts`];
  }

  if (pageType === GeneratedPageType.GENERATED_EXAMPLE && variantMeta) {
    h1 = `${templateDisplay} Example ${variantMeta.titleSuffix}`;
    title = `${templateDisplay} ${variantMeta.titleSuffix} | ${APP_NAME}`;
    description = `${APP_NAME} example ${templateDisplay.toLowerCase()} output ${variantMeta.introSuffix}. Includes prompt ideas, model comparison, and tips.`;
    pageIntro = `This page shows a practical ${templateDisplay.toLowerCase()} example ${variantMeta.introSuffix}, with prompt tweaks and output guidance for real campaigns.`;
    keywords = [
      `${templateDisplay} ${variantMeta.niche}`,
      `AI ${contentTypeLabel} ${variantMeta.niche}`,
      `${variantMeta.niche} marketing copy AI`,
    ];
  }

  if (pageType === GeneratedPageType.BEST_AI_2026) {
    const contentType =
      typeof variant.contentType === "string" && variant.contentType.trim()
        ? humanizeSlug(slugify(variant.contentType))
        : templateDisplay;
    h1 = `Best AI for ${contentType} (${year})`;
    title = `Best AI for ${contentType} ${year} | GPT vs Claude vs Gemini`;
    description = `Compare GPT-4o, Claude, and Gemini for ${contentType.toLowerCase()} workflows. See strengths, examples, and when to use each model inside ${APP_NAME}.`;
    pageIntro = `If you're comparing models for ${contentType.toLowerCase()}, this page gives a practical, creator-focused breakdown based on speed, quality, structure, and iteration workflow.`;
    keywords = [`best AI for ${contentType.toLowerCase()} ${year}`, `Claude vs GPT ${contentType.toLowerCase()}`, `Gemini for ${contentType.toLowerCase()}`];
  }

  if (pageType === GeneratedPageType.DALLE_PROMPTS) {
    const category =
      typeof variant.category === "string" && variant.category.trim()
        ? humanizeSlug(slugify(variant.category))
        : "product images";
    h1 = `DALL-E Prompts for ${category}`;
    title = `DALL-E Prompts for ${category} | ${APP_NAME}`;
    description = `High-performing DALL-E prompt patterns for ${category.toLowerCase()} with composition, lighting, and style tips.`;
    pageIntro = `Use these prompt frameworks to generate cleaner, more consistent ${category.toLowerCase()} images faster.`;
    keywords = [`DALL-E prompts for ${category.toLowerCase()}`, `AI image prompts ${category.toLowerCase()}`, `product image prompts`];
  }

  const examplePrompt =
    template.examplePrompt ||
    `Generate a high-performing ${contentTypeLabel.toLowerCase()} draft for creators and marketers.`;
  const sampleInput = (template.sampleInput ??
    buildTemplatePseoDefaults(template).sampleInput) as JsonRecord;
  const sampleOutput =
    template.sampleOutput ?? buildTemplatePseoDefaults(template).sampleOutput;
  const sharedInputText = safeVariantText(
    variant.sharedInputText ?? variant.sampleInputText,
    12000
  );
  const sharedOutputText = safeVariantText(
    variant.sharedOutputText ?? variant.sampleOutputText,
    24000
  );

  if (variantMeta?.niche) {
    for (const key of Object.keys(sampleInput)) {
      const current = sampleInput[key];
      if (typeof current === "string" && /topic|subject|audience|target/i.test(key)) {
        sampleInput[key] = `${current} (${variantMeta.niche} niche)`;
      }
    }
  }

  if (
    pageType === GeneratedPageType.DALLE_PROMPTS &&
    typeof variant.category === "string"
  ) {
    sampleOutput as unknown;
  }

  const howToSteps = [
    `Pick the ${templateDisplay.toLowerCase()} template (or open it inside ${APP_NAME}).`,
    "Start with a short but specific brief: audience, goal, channel, and constraints.",
    "Generate 2-3 variations and compare tone, structure, and hooks.",
    "Edit facts/claims and publish the strongest version to your workflow.",
  ];

  const tips = [
    "Lead with the desired outcome, not just the topic (e.g. conversions, clicks, replies).",
    "Include channel constraints like word count, CTA style, and brand tone.",
    "Ask for 3 angle variations first, then refine the best one instead of over-prompting once.",
    "Use Claude for structure-heavy drafts and GPT-4o for fast iteration; validate with Gemini if researching angles.",
  ];

  if (pageType === GeneratedPageType.GENERATED_EXAMPLE && variantMeta?.niche) {
    tips.unshift(
      `Name the niche explicitly (${variantMeta.niche}) so the model uses audience-specific language.`
    );
  }

  const faq = [
    {
      question: `Is this ${templateDisplay.toLowerCase()} generator free?`,
      answer: `${APP_NAME} includes a free tier so you can test the template and compare outputs before upgrading.`,
    },
    {
      question: `Which model is best for ${contentTypeLabel.toLowerCase()}?`,
      answer:
        comparisonRows[0]
          ? `Start with ${comparisonRows[0].name} for speed, then test Claude or Gemini when you need deeper structure or alternative angles.`
          : "Test multiple models on the same prompt and compare speed, tone, and structure.",
    },
    {
      question: "Can I use these examples as-is?",
      answer:
        "Use them as starting points. Always edit facts, brand claims, pricing, and compliance details before publishing.",
    },
  ];

  const cta = {
    href: "/register",
    secondaryHref: "/login",
    label: "Try AyoMagic Free",
    subLabel: "Free tier available - GPT-4o, Claude & Gemini in one app",
  };

  return {
    h1,
    title,
    description,
    pageIntro,
    keywords,
    examplePrompt,
    sampleInput,
    sampleOutput,
    sampleInputText: sharedInputText ?? stringifyJson(sampleInput),
    sampleOutputText: sharedOutputText ?? stringifyJson(sampleOutput),
    howToSteps,
    tips,
    faq,
    comparisonRows,
    cta,
    softwareJsonLd: {
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      name: `${APP_NAME} ${templateDisplay}`,
      applicationCategory: "BusinessApplication",
      operatingSystem: "Web",
      description:
        description || `${APP_NAME} is an all-in-one AI writing and image platform for creators and marketers.`,
      offers: {
        "@type": "Offer",
        price: "0",
        priceCurrency: "USD",
      },
      featureList: [
        "GPT-4o, Claude, and Gemini access",
        "50+ content templates",
        "AI image generation",
        "Fast web-based editor",
      ],
      url: path,
    },
    breadcrumbs: [
      { label: "Home", href: "/" },
      {
        label:
          pageType === GeneratedPageType.TEMPLATE
            ? "AI Templates"
            : pageType === GeneratedPageType.TOOL_EXAMPLES
              ? "AI Tools"
              : pageType === GeneratedPageType.GENERATED_EXAMPLE
                ? "AI Generated Examples"
                : "Guides",
        href:
          pageType === GeneratedPageType.TEMPLATE
            ? "/ai-templates"
            : pageType === GeneratedPageType.TOOL_EXAMPLES
              ? "/ai-tools"
              : pageType === GeneratedPageType.GENERATED_EXAMPLE
                ? "/ai-generated-examples"
                : "/ai-templates",
      },
      { label: h1, href: path },
    ],
    ogSnippet:
      typeof sampleOutput === "string"
        ? sampleOutput.slice(0, 120)
        : `${templateDisplay} examples, prompts, and model comparison for creators`,
    siteDescription: APP_DESCRIPTION,
  };
}

