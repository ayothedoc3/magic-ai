-- CreateEnum
CREATE TYPE "GeneratedPageType" AS ENUM (
    'TEMPLATE',
    'TOOL_EXAMPLES',
    'GENERATED_EXAMPLE',
    'BEST_AI_2026',
    'DALLE_PROMPTS'
);

-- AlterTable
ALTER TABLE "Template"
ADD COLUMN "examplePrompt" TEXT,
ADD COLUMN "sampleInput" JSONB,
ADD COLUMN "sampleOutput" JSONB,
ADD COLUMN "supportedModels" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- CreateTable
CREATE TABLE "GeneratedPage" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "pageType" "GeneratedPageType" NOT NULL,
    "templateId" TEXT NOT NULL,
    "variantJson" JSONB NOT NULL DEFAULT '{}',
    "variantHash" TEXT NOT NULL,
    "hitCount" INTEGER NOT NULL DEFAULT 0,
    "published" BOOLEAN NOT NULL DEFAULT true,
    "lastHitAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GeneratedPage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "GeneratedPage_slug_pageType_key" ON "GeneratedPage"("slug", "pageType");

-- CreateIndex
CREATE UNIQUE INDEX "GeneratedPage_templateId_pageType_variantHash_key" ON "GeneratedPage"("templateId", "pageType", "variantHash");

-- CreateIndex
CREATE INDEX "GeneratedPage_pageType_published_idx" ON "GeneratedPage"("pageType", "published");

-- CreateIndex
CREATE INDEX "GeneratedPage_hitCount_idx" ON "GeneratedPage"("hitCount");

-- CreateIndex
CREATE INDEX "GeneratedPage_published_hitCount_idx" ON "GeneratedPage"("published", "hitCount");

-- CreateIndex
CREATE INDEX "GeneratedPage_createdAt_idx" ON "GeneratedPage"("createdAt");

-- CreateIndex
CREATE INDEX "Template_active_category_idx" ON "Template"("active", "category");

-- AddForeignKey
ALTER TABLE "GeneratedPage"
ADD CONSTRAINT "GeneratedPage_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "Template"("id") ON DELETE CASCADE ON UPDATE CASCADE;
