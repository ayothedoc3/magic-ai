export const APP_NAME = "AyoMagic";
export const APP_DESCRIPTION = "AI Content Studio";

export const AI_MODELS = {
  "gpt-4o": { name: "GPT-4o", provider: "openai", icon: "Sparkles" },
  "gpt-4o-mini": { name: "GPT-4o Mini", provider: "openai", icon: "Sparkles" },
  "claude-3-5-sonnet-20241022": {
    name: "Claude 3.5 Sonnet",
    provider: "anthropic",
    icon: "Brain",
  },
  "gemini-1.5-pro": {
    name: "Gemini 1.5 Pro",
    provider: "google",
    icon: "Gem",
  },
} as const;

export const CREDIT_COSTS = {
  chat: 1,
  generate: 5,
  image: 1,
} as const;

export const NAV_ITEMS = [
  { title: "Dashboard", href: "/", icon: "LayoutDashboard" },
  { title: "AI Chat", href: "/chat", icon: "MessageSquare" },
  { title: "Generate", href: "/generate", icon: "Wand2" },
  { title: "Images", href: "/images", icon: "Image" },
  { title: "Documents", href: "/documents", icon: "FileText" },
  { title: "Settings", href: "/settings", icon: "Settings" },
] as const;

export const ADMIN_NAV_ITEMS = [
  { title: "Overview", href: "/admin", icon: "BarChart3" },
  { title: "Users", href: "/admin/users", icon: "Users" },
  { title: "Plans", href: "/admin/plans", icon: "CreditCard" },
  { title: "Templates", href: "/admin/templates", icon: "Layout" },
  { title: "Settings", href: "/admin/settings", icon: "Settings2" },
] as const;
