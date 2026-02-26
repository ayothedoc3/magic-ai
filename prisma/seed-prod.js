// Lightweight production seed script (plain JS, no tsx needed)
// Only creates records if they don't already exist (upsert).

const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function main() {
  // Create admin user
  const hashedPassword = await bcrypt.hash("admin123", 12);
  await prisma.user.upsert({
    where: { email: "admin@ayomagic.com" },
    update: {},
    create: {
      name: "Admin",
      email: "admin@ayomagic.com",
      hashedPassword,
      role: "ADMIN",
      credits: { text: 99999, image: 99999 },
    },
  });
  console.log("  Admin user ready");

  // Create templates
  const templates = [
    {
      name: "Blog Post",
      slug: "blog-post",
      description: "Generate a full blog post on any topic",
      category: "blog",
      icon: "FileText",
      prompt:
        "Write a detailed, SEO-optimized blog post about {{topic}}. Target audience: {{audience}}. Tone: {{tone}}. Include an introduction, main sections with headers, and a conclusion.",
      fields: [
        { name: "topic", label: "Topic", type: "text", required: true },
        { name: "audience", label: "Target Audience", type: "text", required: false },
        { name: "tone", label: "Tone", type: "select", options: ["Professional", "Casual", "Friendly", "Authoritative"], required: false },
      ],
    },
    {
      name: "Email Copy",
      slug: "email-copy",
      description: "Create compelling email content",
      category: "email",
      icon: "Mail",
      prompt:
        "Write a {{email_type}} email about {{subject}}. Key points to include: {{key_points}}. Call to action: {{cta}}.",
      fields: [
        { name: "email_type", label: "Email Type", type: "select", options: ["Marketing", "Welcome", "Follow-up", "Newsletter", "Cold Outreach"], required: true },
        { name: "subject", label: "Subject/Topic", type: "text", required: true },
        { name: "key_points", label: "Key Points", type: "textarea", required: false },
        { name: "cta", label: "Call to Action", type: "text", required: false },
      ],
    },
    {
      name: "Social Media Post",
      slug: "social-media",
      description: "Create engaging social media content",
      category: "social",
      icon: "Share2",
      prompt:
        "Create a {{platform}} post about {{topic}}. Style: {{style}}. Include relevant hashtags.",
      fields: [
        { name: "platform", label: "Platform", type: "select", options: ["Twitter/X", "LinkedIn", "Instagram", "Facebook"], required: true },
        { name: "topic", label: "Topic", type: "text", required: true },
        { name: "style", label: "Style", type: "select", options: ["Informative", "Engaging", "Promotional", "Thought Leadership"], required: false },
      ],
    },
    {
      name: "Product Description",
      slug: "product-description",
      description: "Write compelling product descriptions",
      category: "marketing",
      icon: "ShoppingBag",
      prompt:
        "Write a compelling product description for {{product_name}}. Features: {{features}}. Target customer: {{target}}. Tone: {{tone}}.",
      fields: [
        { name: "product_name", label: "Product Name", type: "text", required: true },
        { name: "features", label: "Key Features", type: "textarea", required: true },
        { name: "target", label: "Target Customer", type: "text", required: false },
        { name: "tone", label: "Tone", type: "select", options: ["Professional", "Luxury", "Casual", "Technical"], required: false },
      ],
    },
    {
      name: "Code Generator",
      slug: "code-generator",
      description: "Generate code snippets and functions",
      category: "code",
      icon: "Code",
      prompt:
        "Write {{language}} code for: {{description}}. Requirements: {{requirements}}. Include comments explaining the code.",
      fields: [
        { name: "language", label: "Programming Language", type: "select", options: ["TypeScript", "Python", "JavaScript", "Go", "Rust", "SQL"], required: true },
        { name: "description", label: "What should the code do?", type: "textarea", required: true },
        { name: "requirements", label: "Special Requirements", type: "textarea", required: false },
      ],
    },
    {
      name: "SEO Meta Tags",
      slug: "seo-meta",
      description: "Generate SEO-optimized meta titles and descriptions",
      category: "marketing",
      icon: "Search",
      prompt:
        "Generate SEO meta tags for a page about {{page_topic}}. Target keywords: {{keywords}}. Provide a meta title (under 60 chars) and meta description (under 160 chars).",
      fields: [
        { name: "page_topic", label: "Page Topic", type: "text", required: true },
        { name: "keywords", label: "Target Keywords", type: "text", required: true },
      ],
    },
  ];

  for (const template of templates) {
    await prisma.template.upsert({
      where: { slug: template.slug },
      update: template,
      create: template,
    });
  }
  console.log("  Templates ready (" + templates.length + ")");

  // Create plans
  const plans = [
    {
      name: "Free",
      stripePriceId: "price_free",
      stripeProductId: "prod_free",
      price: 0,
      interval: "MONTHLY",
      credits: { text: 100, image: 5 },
      features: ["100 text credits/mo", "5 image credits/mo", "GPT-4o Mini access", "Basic templates"],
      active: true,
      sortOrder: 0,
    },
    {
      name: "Pro",
      stripePriceId: "price_pro_placeholder",
      stripeProductId: "prod_pro_placeholder",
      price: 1900,
      interval: "MONTHLY",
      credits: { text: 5000, image: 100 },
      features: ["5,000 text credits/mo", "100 image credits/mo", "All AI models", "All templates", "Priority support"],
      active: true,
      isFeatured: true,
      sortOrder: 1,
    },
    {
      name: "Business",
      stripePriceId: "price_business_placeholder",
      stripeProductId: "prod_business_placeholder",
      price: 4900,
      interval: "MONTHLY",
      credits: { text: 25000, image: 500 },
      features: ["25,000 text credits/mo", "500 image credits/mo", "All AI models", "All templates", "Team workspace", "Priority support", "API access"],
      active: true,
      sortOrder: 2,
    },
  ];

  for (const plan of plans) {
    await prisma.plan.upsert({
      where: { stripePriceId: plan.stripePriceId },
      update: plan,
      create: plan,
    });
  }
  console.log("  Plans ready (" + plans.length + ")");
}

main()
  .then(() => console.log("Seed completed"))
  .catch((e) => {
    console.error("Seed error:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
