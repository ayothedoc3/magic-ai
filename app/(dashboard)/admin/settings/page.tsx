import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { requireAdminSession } from "@/lib/admin";
import { prisma } from "@/lib/prisma";

type EnvCheck = {
  key: string;
  label: string;
  required: boolean;
  configured: boolean;
  notes?: string;
};

function envConfigured(value: string | undefined) {
  return Boolean(value && value.trim().length > 0);
}

export default async function AdminSettingsPage() {
  await requireAdminSession();

  const envChecks: EnvCheck[] = [
    {
      key: "NEXT_PUBLIC_APP_URL",
      label: "App URL",
      required: true,
      configured: envConfigured(process.env.NEXT_PUBLIC_APP_URL),
      notes: "Public web app base URL",
    },
    {
      key: "NEXT_PUBLIC_GA_MEASUREMENT_ID",
      label: "Google Analytics (GA4)",
      required: false,
      configured: envConfigured(process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID),
      notes: "Optional external analytics fan-out (first-party tracking runs without this)",
    },
    {
      key: "GA4_API_SECRET",
      label: "GA4 API Secret",
      required: false,
      configured: envConfigured(process.env.GA4_API_SECRET),
      notes: "Optional for forwarding server-side events to GA4",
    },
    {
      key: "DATABASE_URL",
      label: "Database",
      required: true,
      configured: envConfigured(process.env.DATABASE_URL),
      notes: "Primary Postgres connection string",
    },
    {
      key: "NEXTAUTH_URL",
      label: "Auth URL",
      required: true,
      configured: envConfigured(process.env.NEXTAUTH_URL),
      notes: "Canonical callback URL for Auth.js",
    },
    {
      key: "NEXTAUTH_SECRET",
      label: "Auth Secret",
      required: true,
      configured: envConfigured(process.env.NEXTAUTH_SECRET),
      notes: "Session/JWT signing secret",
    },
    {
      key: "GOOGLE_CLIENT_ID",
      label: "Google OAuth Client ID",
      required: false,
      configured: envConfigured(process.env.GOOGLE_CLIENT_ID),
      notes: "Only needed if Google sign-in is enabled",
    },
    {
      key: "GOOGLE_CLIENT_SECRET",
      label: "Google OAuth Secret",
      required: false,
      configured: envConfigured(process.env.GOOGLE_CLIENT_SECRET),
      notes: "Only needed if Google sign-in is enabled",
    },
    {
      key: "OPENAI_API_KEY",
      label: "OpenAI API",
      required: true,
      configured: envConfigured(process.env.OPENAI_API_KEY),
      notes: "At least one AI provider must be configured",
    },
    {
      key: "ANTHROPIC_API_KEY",
      label: "Anthropic API",
      required: false,
      configured: envConfigured(process.env.ANTHROPIC_API_KEY),
      notes: "Optional multi-model support",
    },
    {
      key: "GOOGLE_GENERATIVE_AI_API_KEY",
      label: "Google Gemini API",
      required: false,
      configured: envConfigured(process.env.GOOGLE_GENERATIVE_AI_API_KEY),
      notes: "Optional multi-model support",
    },
    {
      key: "STRIPE_SECRET_KEY",
      label: "Stripe Secret",
      required: true,
      configured: envConfigured(process.env.STRIPE_SECRET_KEY),
      notes: "Required for paid subscriptions",
    },
    {
      key: "STRIPE_WEBHOOK_SECRET",
      label: "Stripe Webhook",
      required: true,
      configured: envConfigured(process.env.STRIPE_WEBHOOK_SECRET),
      notes: "Required for subscription sync",
    },
    {
      key: "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY",
      label: "Stripe Publishable Key",
      required: true,
      configured: envConfigured(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY),
      notes: "Frontend checkout and billing UI",
    },
    {
      key: "AGENT_QUEUE_CRON_SECRET",
      label: "Agent Cron Secret",
      required: false,
      configured: envConfigured(process.env.AGENT_QUEUE_CRON_SECRET),
      notes: "Required for cron-triggered queue/schedule dispatch endpoints",
    },
    {
      key: "PSEO_CRON_SECRET",
      label: "pSEO Cron Secret",
      required: false,
      configured: envConfigured(process.env.PSEO_CRON_SECRET),
      notes: "Optional secret for the pSEO preseed cron endpoint",
    },
  ];

  const requiredMissing = envChecks.filter(
    (check) => check.required && !check.configured
  );
  const aiProviderConfigured = envChecks.some(
    (check) =>
      [
        "OPENAI_API_KEY",
        "ANTHROPIC_API_KEY",
        "GOOGLE_GENERATIVE_AI_API_KEY",
      ].includes(check.key) && check.configured
  );

  let dbHealth = {
    connected: true,
    error: "" as string | null,
    userCount: 0,
    planCount: 0,
    activePlanCount: 0,
    templateCount: 0,
    placeholderStripePlans: 0,
  };

  try {
    const [userCount, plans, templateCount] = await Promise.all([
      prisma.user.count(),
      prisma.plan.findMany({
        select: { stripePriceId: true, stripeProductId: true, active: true },
      }),
      prisma.template.count(),
    ]);

    dbHealth = {
      connected: true,
      error: null,
      userCount,
      planCount: plans.length,
      activePlanCount: plans.filter((plan) => plan.active).length,
      templateCount,
      placeholderStripePlans: plans.filter(
        (plan) =>
          plan.stripePriceId.includes("placeholder") ||
          plan.stripeProductId.includes("placeholder")
      ).length,
    };
  } catch (error) {
    dbHealth = {
      connected: false,
      error: error instanceof Error ? error.message : "Unknown database error",
      userCount: 0,
      planCount: 0,
      activePlanCount: 0,
      templateCount: 0,
      placeholderStripePlans: 0,
    };
  }

  const launchBlockers: string[] = [];

  if (requiredMissing.length > 0) {
    launchBlockers.push(
      `${requiredMissing.length} required environment variable(s) are missing`
    );
  }
  if (!aiProviderConfigured) {
    launchBlockers.push("No AI provider API key is configured");
  }
  if (!dbHealth.connected) {
    launchBlockers.push("Database connection check failed");
  }
  if (dbHealth.connected && dbHealth.activePlanCount === 0) {
    launchBlockers.push("No active billing plans are configured");
  }
  if (dbHealth.connected && dbHealth.placeholderStripePlans > 0) {
    launchBlockers.push("One or more plans still use placeholder Stripe IDs");
  }
  if (dbHealth.connected && dbHealth.templateCount === 0) {
    launchBlockers.push("No templates are available for customers");
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Admin Settings</h1>
        <p className="text-muted-foreground">
          Launch-readiness checks for infrastructure, billing, and product
          catalog.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Launch Blockers</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{launchBlockers.length}</div>
            <p className="text-xs text-muted-foreground">
              Must be resolved for production launch.
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">DB Status</CardTitle>
          </CardHeader>
          <CardContent>
            <Badge variant={dbHealth.connected ? "default" : "destructive"}>
              {dbHealth.connected ? "Connected" : "Disconnected"}
            </Badge>
            {dbHealth.connected ? (
              <p className="mt-2 text-xs text-muted-foreground">
                {dbHealth.userCount} users · {dbHealth.planCount} plans ·{" "}
                {dbHealth.templateCount} templates
              </p>
            ) : (
              <p className="mt-2 break-words text-xs text-muted-foreground">
                {dbHealth.error}
              </p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">AI Providers</CardTitle>
          </CardHeader>
          <CardContent>
            <Badge variant={aiProviderConfigured ? "default" : "destructive"}>
              {aiProviderConfigured ? "Configured" : "Missing"}
            </Badge>
            <p className="mt-2 text-xs text-muted-foreground">
              OpenAI required for your current launch checklist (you can relax
              this later).
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Launch Blockers</CardTitle>
          <CardDescription>
            These are generated from the current environment and database state.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {launchBlockers.length === 0 ? (
            <div className="rounded-md border p-3 text-sm">
              No automatic blockers detected. Do a full staging pass (auth,
              generation, billing, admin flows) before production launch.
            </div>
          ) : (
            <ul className="space-y-2 text-sm">
              {launchBlockers.map((blocker) => (
                <li key={blocker} className="rounded-md border p-3">
                  {blocker}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Environment Checklist</CardTitle>
          <CardDescription>
            Values are not shown for security. This only checks presence.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {envChecks.map((check) => (
            <div
              key={check.key}
              className="flex flex-col gap-2 rounded-md border p-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium">{check.label}</p>
                <p className="text-xs text-muted-foreground">
                  {check.key}
                  {check.notes ? ` · ${check.notes}` : ""}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={check.required ? "outline" : "secondary"}>
                  {check.required ? "Required" : "Optional"}
                </Badge>
                <Badge variant={check.configured ? "default" : "destructive"}>
                  {check.configured ? "Configured" : "Missing"}
                </Badge>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            Enterprise Readiness Gaps (Manual)
          </CardTitle>
          <CardDescription>
            High-priority items for selling to enterprise customers.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>1. SSO/SAML and SCIM user provisioning</p>
          <p>2. Audit logs (admin actions, billing changes, data exports)</p>
          <p>3. RBAC beyond USER/ADMIN (workspace roles and permissions)</p>
          <p>4. Data retention controls and DPA/security documentation</p>
          <p>5. Observability: error monitoring, uptime alerts, usage anomalies</p>
        </CardContent>
      </Card>
    </div>
  );
}
