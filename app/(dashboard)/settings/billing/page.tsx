import Link from "next/link";
import { redirect } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  formatDateTime,
  formatUsdCents,
  getCreditsFromJson,
  getStringArrayFromJson,
} from "@/lib/admin";

type SearchParams = Record<string, string | string[] | undefined>;

function subscriptionBadgeVariant(status: string | null | undefined) {
  if (!status) return "secondary" as const;
  if (status === "ACTIVE") return "default" as const;
  if (status === "TRIALING") return "outline" as const;
  if (status === "PAST_DUE" || status === "UNPAID") return "destructive" as const;
  return "secondary" as const;
}

function getFirstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function getBillingMessage(params: SearchParams | undefined) {
  const checkout = getFirstParam(params?.checkout);
  const portal = getFirstParam(params?.portal);
  const error = getFirstParam(params?.error);

  if (checkout === "success") {
    return {
      tone: "success" as const,
      title: "Checkout completed",
      description:
        "Stripe checkout returned successfully. Subscription changes may take a moment to appear after webhook processing.",
    };
  }

  if (checkout === "cancelled") {
    return {
      tone: "neutral" as const,
      title: "Checkout cancelled",
      description: "No billing changes were applied.",
    };
  }

  if (portal === "returned") {
    return {
      tone: "neutral" as const,
      title: "Returned from billing portal",
      description: "Your billing portal session closed. Refresh if changes are still syncing.",
    };
  }

  if (!error) return null;

  const map: Record<string, { title: string; description: string }> = {
    unauthorized: {
      title: "Sign-in required",
      description: "Please sign in again and retry the billing action.",
    },
    stripe_not_configured: {
      title: "Stripe is not configured",
      description: "Billing actions are unavailable until Stripe keys are configured.",
    },
    missing_plan: {
      title: "Missing plan selection",
      description: "Select a plan and retry checkout.",
    },
    plan_not_found: {
      title: "Plan not available",
      description: "The selected plan was not found or is inactive.",
    },
    plan_not_ready: {
      title: "Plan not launch-ready",
      description: "This plan still uses placeholder Stripe IDs.",
    },
    free_plan_checkout_not_required: {
      title: "Free plan selected",
      description: "Checkout is not required for the free plan.",
    },
    no_billing_portal_customer: {
      title: "Billing portal unavailable",
      description: "No Stripe customer record was found for this account yet.",
    },
    stripe_request_failed: {
      title: "Stripe checkout failed",
      description: "Stripe could not create the checkout session. Please retry.",
    },
    stripe_request_invalid: {
      title: "Stripe rejected checkout request",
      description: "Billing configuration may be incomplete or invalid.",
    },
    stripe_portal_failed: {
      title: "Stripe portal failed",
      description: "Stripe could not create a billing portal session. Please retry.",
    },
    stripe_portal_invalid: {
      title: "Stripe portal request invalid",
      description: "Billing portal is not configured correctly yet.",
    },
    checkout_failed: {
      title: "Checkout failed",
      description: "The billing checkout request could not be completed.",
    },
    portal_failed: {
      title: "Portal failed",
      description: "The billing portal request could not be completed.",
    },
    user_not_found: {
      title: "User record unavailable",
      description: "Reload the page and try again.",
    },
  };

  const fallback = {
    title: "Billing action failed",
    description: `Error: ${error}`,
  };

  return {
    tone: "error" as const,
    ...(map[error] ?? fallback),
  };
}

function noticeClasses(tone: "success" | "error" | "neutral") {
  if (tone === "success") return "border-emerald-500/30 bg-emerald-500/5";
  if (tone === "error") return "border-destructive/40 bg-destructive/5";
  return "border-border bg-muted/30";
}

export default async function BillingSettingsPage({
  searchParams,
}: {
  searchParams?: SearchParams;
}) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const [user, plans, generation30d, agentRuns30d] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        credits: true,
        subscription: {
          select: {
            id: true,
            status: true,
            currentPeriodStart: true,
            currentPeriodEnd: true,
            cancelAtPeriodEnd: true,
            stripeCustomerId: true,
            stripeSubscriptionId: true,
            updatedAt: true,
            plan: {
              select: {
                id: true,
                name: true,
                description: true,
                price: true,
                interval: true,
                credits: true,
                features: true,
              },
            },
          },
        },
      },
    }),
    prisma.plan.findMany({
      where: { active: true },
      orderBy: [{ sortOrder: "asc" }, { price: "asc" }],
      select: {
        id: true,
        name: true,
        description: true,
        price: true,
        interval: true,
        credits: true,
        features: true,
        trialDays: true,
        isFeatured: true,
        stripePriceId: true,
        stripeProductId: true,
      },
    }),
    prisma.generation.count({
      where: {
        userId: session.user.id,
        createdAt: {
          gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        },
      },
    }),
    prisma.agentRun.count({
      where: {
        requestedById: session.user.id,
        createdAt: {
          gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        },
      },
    }),
  ]);

  if (!user) {
    redirect("/login");
  }

  const credits = getCreditsFromJson(user.credits);
  const subscription = user.subscription;
  const currentPlanId = subscription?.plan.id ?? null;
  const hasStripeRuntime =
    Boolean(process.env.STRIPE_SECRET_KEY?.trim()) &&
    Boolean(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY?.trim());
  const hasStripeWebhook = Boolean(process.env.STRIPE_WEBHOOK_SECRET?.trim());
  const hasPlaceholderPlanIds = plans.some(
    (plan) =>
      plan.stripePriceId.includes("placeholder") ||
      plan.stripeProductId.includes("placeholder")
  );

  const billingReadyForSelfServe =
    hasStripeRuntime && hasStripeWebhook && !hasPlaceholderPlanIds;
  const flashMessage = getBillingMessage(searchParams);
  const canOpenPortal = hasStripeRuntime && Boolean(subscription?.stripeCustomerId);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Billing</h1>
          <p className="text-muted-foreground">
            Subscription status, plan options, and billing readiness for your
            workspace.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/settings"
            className="rounded-md border px-3 py-2 text-sm hover:bg-muted"
          >
            Back to Settings
          </Link>
          {user.role === "ADMIN" && (
            <Link
              href="/admin/plans"
              className="rounded-md border px-3 py-2 text-sm hover:bg-muted"
            >
              Admin Plans
            </Link>
          )}
        </div>
      </div>

      {flashMessage && (
        <div className={`rounded-md border p-4 ${noticeClasses(flashMessage.tone)}`}>
          <p className="text-sm font-medium">{flashMessage.title}</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {flashMessage.description}
          </p>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Current Plan</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">
              {subscription?.plan.name ?? "Free / None"}
            </div>
            <p className="text-xs text-muted-foreground">
              {subscription ? subscription.plan.interval : "No active subscription"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Billing Status</CardTitle>
          </CardHeader>
          <CardContent>
            <Badge variant={subscriptionBadgeVariant(subscription?.status)}>
              {subscription?.status ?? "FREE"}
            </Badge>
            <p className="mt-2 text-xs text-muted-foreground">
              {subscription
                ? `Period ends ${formatDateTime(subscription.currentPeriodEnd)}`
                : "Upgrade to unlock paid billing features"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Generations (30d)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {generation30d.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              AI outputs tracked in last 30 days
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Agent Runs (30d)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{agentRuns30d.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              Agent execution requests in last 30 days
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Current Subscription</CardTitle>
            <CardDescription>
              Live subscription record for your account
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            {subscription ? (
              <>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant={subscriptionBadgeVariant(subscription.status)}>
                    {subscription.status}
                  </Badge>
                  <span className="font-medium">
                    {subscription.plan.name} ({subscription.plan.interval})
                  </span>
                  {subscription.cancelAtPeriodEnd && (
                    <Badge variant="secondary">Cancels At Period End</Badge>
                  )}
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-md border p-3">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">
                      Current Period Start
                    </p>
                    <p className="mt-1">{formatDateTime(subscription.currentPeriodStart)}</p>
                  </div>
                  <div className="rounded-md border p-3">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">
                      Current Period End
                    </p>
                    <p className="mt-1">{formatDateTime(subscription.currentPeriodEnd)}</p>
                  </div>
                </div>

                <div className="rounded-md border p-3">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">
                    Plan Credits
                  </p>
                  {(() => {
                    const planCredits = getCreditsFromJson(subscription.plan.credits);
                    const features = getStringArrayFromJson(subscription.plan.features);
                    return (
                      <div className="mt-2 space-y-2">
                        <p>Text: {planCredits.text.toLocaleString()}</p>
                        <p>Image: {planCredits.image.toLocaleString()}</p>
                        {features.length > 0 && (
                          <div className="pt-1">
                            <p className="text-xs uppercase tracking-wide text-muted-foreground">
                              Features
                            </p>
                            <ul className="mt-1 space-y-1 text-xs text-muted-foreground">
                              {features.slice(0, 6).map((feature) => (
                                <li key={feature}>- {feature}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>

                <div className="rounded-md border border-dashed p-3 text-xs text-muted-foreground">
                  Manage upgrades, cancellations, and payment methods in the
                  Stripe billing portal.
                </div>
                <form action="/api/billing/portal" method="post" className="pt-1">
                  <Button type="submit" variant="outline" size="sm">
                    Open Billing Portal
                  </Button>
                </form>
              </>
            ) : (
              <div className="space-y-3">
                <Badge variant="secondary">No active subscription</Badge>
                <p className="text-muted-foreground">
                  You are using the free tier or self-serve billing has not been
                  completed yet.
                </p>
                <div className="rounded-md border p-3">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">
                    Current Credits
                  </p>
                  <p className="mt-1">Text: {credits.text.toLocaleString()}</p>
                  <p>Image: {credits.image.toLocaleString()}</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Billing Readiness</CardTitle>
            <CardDescription>
              Current app status for self-serve billing enablement
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Stripe runtime keys</span>
              <Badge variant={hasStripeRuntime ? "default" : "destructive"}>
                {hasStripeRuntime ? "Configured" : "Missing"}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Stripe webhook secret</span>
              <Badge variant={hasStripeWebhook ? "default" : "destructive"}>
                {hasStripeWebhook ? "Configured" : "Missing"}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Live plan IDs</span>
              <Badge variant={hasPlaceholderPlanIds ? "destructive" : "default"}>
                {hasPlaceholderPlanIds ? "Placeholders Found" : "Ready"}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Self-serve billing</span>
              <Badge
                variant={billingReadyForSelfServe ? "default" : "secondary"}
              >
                {billingReadyForSelfServe ? "Ready to wire UI" : "Not Ready"}
              </Badge>
            </div>
            <div className="rounded-md border border-dashed p-3 text-xs text-muted-foreground">
              Checkout and portal session creation are wired. Webhook syncing is
              still required to keep subscription records accurate after changes.
            </div>
            <div className="flex flex-wrap gap-2 pt-1">
              {canOpenPortal ? (
                <form action="/api/billing/portal" method="post">
                  <Button type="submit" variant="outline" size="sm">
                    Open Billing Portal
                  </Button>
                </form>
              ) : null}
              {billingReadyForSelfServe && !subscription ? (
                <span className="text-xs text-muted-foreground">
                  Choose a paid plan below to start checkout.
                </span>
              ) : null}
            </div>
            {user.role === "ADMIN" && (
              <div className="flex flex-wrap gap-2 pt-1">
                <Link
                  href="/admin/plans"
                  className="text-xs text-primary hover:underline"
                >
                  Review billing plans
                </Link>
                <Link
                  href="/admin/settings"
                  className="text-xs text-primary hover:underline"
                >
                  Open launch checklist
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Available Plans</CardTitle>
          <CardDescription>
            Read-only plan catalog visible to this app instance
          </CardDescription>
        </CardHeader>
        <CardContent>
          {plans.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No active plans are configured.
            </p>
          ) : (
            <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
              {plans.map((plan) => {
                const planCredits = getCreditsFromJson(plan.credits);
                const features = getStringArrayFromJson(plan.features);
                const isCurrent = currentPlanId === plan.id;
                const hasPlaceholderStripeIds =
                  plan.stripePriceId.includes("placeholder") ||
                  plan.stripeProductId.includes("placeholder");

                return (
                  <Card key={plan.id} className={isCurrent ? "border-primary" : ""}>
                    <CardHeader>
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <CardTitle className="text-lg">{plan.name}</CardTitle>
                          <CardDescription>
                            {plan.description ?? "No description"}
                          </CardDescription>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {isCurrent && <Badge>Current</Badge>}
                          {plan.isFeatured && <Badge variant="outline">Featured</Badge>}
                          {hasPlaceholderStripeIds && user.role === "ADMIN" && (
                            <Badge variant="destructive">Placeholder IDs</Badge>
                          )}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3 text-sm">
                      <div className="rounded-md border p-3">
                        <p className="text-2xl font-bold">{formatUsdCents(plan.price)}</p>
                        <p className="text-xs text-muted-foreground">
                          {plan.interval} {plan.trialDays > 0 ? `· ${plan.trialDays} trial days` : ""}
                        </p>
                      </div>
                      <div className="rounded-md border p-3 text-xs text-muted-foreground">
                        <p>Text credits: {planCredits.text.toLocaleString()}</p>
                        <p>Image credits: {planCredits.image.toLocaleString()}</p>
                      </div>
                      <div className="rounded-md border p-3">
                        <p className="text-xs uppercase tracking-wide text-muted-foreground">
                          Features
                        </p>
                        {features.length === 0 ? (
                          <p className="mt-1 text-xs text-muted-foreground">
                            No features listed
                          </p>
                        ) : (
                          <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
                            {features.slice(0, 6).map((feature) => (
                              <li key={feature}>- {feature}</li>
                            ))}
                          </ul>
                        )}
                      </div>
                      {isCurrent ? (
                        <div className="space-y-2">
                          <div className="rounded-md border border-primary/40 bg-primary/5 p-3 text-xs">
                            This is your current subscription plan.
                          </div>
                          {canOpenPortal ? (
                            <form action="/api/billing/portal" method="post">
                              <Button
                                type="submit"
                                variant="outline"
                                size="sm"
                                className="w-full"
                              >
                                Manage In Billing Portal
                              </Button>
                            </form>
                          ) : null}
                        </div>
                      ) : plan.price <= 0 ? (
                        <div className="rounded-md border border-dashed p-3 text-xs text-muted-foreground">
                          Free plan does not require checkout.
                        </div>
                      ) : billingReadyForSelfServe && !hasPlaceholderStripeIds ? (
                        <form action="/api/billing/checkout" method="post" className="space-y-2">
                          <input type="hidden" name="planId" value={plan.id} />
                          <Button type="submit" className="w-full">
                            {subscription ? "Switch Via Checkout" : "Start Checkout"}
                          </Button>
                          <p className="text-xs text-muted-foreground">
                            You&apos;ll be redirected to Stripe Checkout.
                          </p>
                        </form>
                      ) : (
                        <div className="rounded-md border border-dashed p-3 text-xs text-muted-foreground">
                          Checkout unavailable until Stripe keys, webhook secret,
                          and live plan IDs are configured.
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {subscription && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Billing Record Metadata</CardTitle>
            <CardDescription>
              Debug-friendly identifiers (shown to help with staging and launch)
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2 text-sm">
            <div className="rounded-md border p-3">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                Stripe Customer ID
              </p>
              <p className="mt-1 break-all font-mono text-xs">
                {subscription.stripeCustomerId}
              </p>
            </div>
            <div className="rounded-md border p-3">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                Stripe Subscription ID
              </p>
              <p className="mt-1 break-all font-mono text-xs">
                {subscription.stripeSubscriptionId}
              </p>
            </div>
            <div className="rounded-md border p-3 sm:col-span-2">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                Last Updated
              </p>
              <p className="mt-1">{formatDateTime(subscription.updatedAt)}</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
