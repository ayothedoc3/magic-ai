"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function getTemplates(category?: string) {
  const where: { active: boolean; category?: string } = { active: true };
  if (category) where.category = category;

  return prisma.template.findMany({
    where,
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      slug: true,
      description: true,
      category: true,
      icon: true,
      fields: true,
    },
  });
}

export async function getTemplateCategories() {
  const templates = await prisma.template.findMany({
    where: { active: true },
    select: { category: true },
    distinct: ["category"],
    orderBy: { category: "asc" },
  });
  return templates.map((t) => t.category);
}

export async function getTemplateBySlug(slug: string) {
  return prisma.template.findUnique({
    where: { slug },
    select: {
      id: true,
      name: true,
      slug: true,
      description: true,
      category: true,
      icon: true,
      prompt: true,
      fields: true,
      examplePrompt: true,
    },
  });
}

export async function saveGenerationToDocument(
  title: string,
  content: string,
  templateId?: string
) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  return prisma.document.create({
    data: {
      title: title.slice(0, 200),
      content,
      userId: session.user.id,
      templateId: templateId || null,
    },
  });
}
