import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  formatDateTime,
  formatUsdCents,
  getCreditsFromJson,
  getStringArrayFromJson,
  requireAdminSession,
} from "@/lib/admin";
import { prisma } from "@/lib/prisma";

export default async function AdminPlansPage() {
  await requireAdminSession();

  const plans = await prisma.plan.findMany({
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    select: {
      id: true,
      name: true,
      description: true,
      stripePriceId: true,
      stripeProductId: true,
      price: true,
      interval: true,
      credits: true,
      features: true,
      active: true,
      isFeatured: true,
      sortOrder: true,
      trialDays: true,
      updatedAt: true,
      _count: {
        select: {
          subscriptions: true,
        },
      },
    },
  });

  const placeholderStripePlans = plans.filter(
    (plan) =>
      plan.stripePriceId.includes("placeholder") ||
      plan.stripeProductId.includes("placeholder")
  ).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Plans</h1>
        <p className="text-muted-foreground">
          Pricing catalog and billing plan readiness.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Plans</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{plans.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Active Plans</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {plans.filter((plan) => plan.active).length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Placeholder Stripe IDs
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {placeholderStripePlans.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              Replace before production billing goes live.
            </p>
          </CardContent>
        </Card>
      </div>

      {plans.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>No plans configured</CardTitle>
            <CardDescription>
              Seed plans or create plans in the database before launching paid
              subscriptions.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          {plans.map((plan) => {
            const credits = getCreditsFromJson(plan.credits);
            const features = getStringArrayFromJson(plan.features);
            const hasPlaceholderStripeIds =
              plan.stripePriceId.includes("placeholder") ||
              plan.stripeProductId.includes("placeholder");

            return (
              <Card key={plan.id}>
                <CardHeader>
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <CardTitle className="text-xl">{plan.name}</CardTitle>
                      <CardDescription>
                        {plan.description ?? "No description"}
                      </CardDescription>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Badge variant={plan.active ? "default" : "secondary"}>
                        {plan.active ? "Active" : "Inactive"}
                      </Badge>
                      {plan.isFeatured && <Badge variant="outline">Featured</Badge>}
                      {hasPlaceholderStripeIds && (
                        <Badge variant="destructive">Stripe Placeholder</Badge>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4 text-sm">
                  <div className="flex items-end justify-between rounded-md border p-3">
                    <div>
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">
                        Price
                      </p>
                      <p className="text-2xl font-bold">{formatUsdCents(plan.price)}</p>
                    </div>
                    <div className="text-right text-xs text-muted-foreground">
                      <p>{plan.interval}</p>
                      <p>{plan.trialDays} trial day(s)</p>
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-md border p-3">
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">
                        Credits
                      </p>
                      <p className="mt-1 text-sm">
                        Text: {credits.text.toLocaleString()}
                      </p>
                      <p className="text-sm">
                        Image: {credits.image.toLocaleString()}
                      </p>
                    </div>
                    <div className="rounded-md border p-3">
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">
                        Billing Links
                      </p>
                      <p className="mt-1 break-all text-xs text-muted-foreground">
                        Price: {plan.stripePriceId}
                      </p>
                      <p className="break-all text-xs text-muted-foreground">
                        Product: {plan.stripeProductId}
                      </p>
                    </div>
                  </div>

                  <div className="rounded-md border p-3">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">
                      Features
                    </p>
                    {features.length === 0 ? (
                      <p className="mt-1 text-sm text-muted-foreground">
                        No features listed.
                      </p>
                    ) : (
                      <ul className="mt-2 space-y-1 text-sm">
                        {features.map((feature) => (
                          <li key={feature}>• {feature}</li>
                        ))}
                      </ul>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                    <span>Subscribers: {plan._count.subscriptions}</span>
                    <span>Sort order: {plan.sortOrder}</span>
                    <span>Updated: {formatDateTime(plan.updatedAt)}</span>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
