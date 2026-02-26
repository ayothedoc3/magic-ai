import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  StripeApiError,
  createStripeCheckoutSession,
  isStripeServerConfigured,
} from "@/lib/stripe";
import { trackGa4ServerEvent } from "@/lib/analytics.server";

export const runtime = "nodejs";

function getBaseUrl(request: NextRequest) {
  const configured =
    process.env.NEXT_PUBLIC_APP_URL?.trim() || process.env.NEXTAUTH_URL?.trim();

  if (configured) {
    try {
      return new URL(configured);
    } catch {
      // fall through
    }
  }

  return request.nextUrl;
}

function redirectToBilling(
  request: NextRequest,
  params: Record<string, string | null | undefined>
) {
  const url = new URL("/settings/billing", getBaseUrl(request));
  for (const [key, value] of Object.entries(params)) {
    if (value) {
      url.searchParams.set(key, value);
    }
  }
  return NextResponse.redirect(url, { status: 303 });
}

function safeString(value: FormDataEntryValue | null | undefined, maxLength = 200) {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, maxLength) : undefined;
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return redirectToBilling(request, { error: "unauthorized" });
  }

  if (!isStripeServerConfigured()) {
    return redirectToBilling(request, { error: "stripe_not_configured" });
  }

  const formData = await request.formData();
  const planId = safeString(formData.get("planId"), 100);

  if (!planId) {
    return redirectToBilling(request, { error: "missing_plan" });
  }

  const [user, plan, subscription] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, email: true },
    }),
    prisma.plan.findFirst({
      where: { id: planId, active: true },
      select: {
        id: true,
        name: true,
        price: true,
        interval: true,
        stripePriceId: true,
        stripeProductId: true,
      },
    }),
    prisma.subscription.findUnique({
      where: { userId: session.user.id },
      select: {
        stripeCustomerId: true,
        stripeSubscriptionId: true,
        status: true,
      },
    }),
  ]);

  if (!user?.email) {
    return redirectToBilling(request, { error: "user_not_found" });
  }

  if (!plan) {
    return redirectToBilling(request, { error: "plan_not_found" });
  }

  if (
    plan.stripePriceId.includes("placeholder") ||
    plan.stripeProductId.includes("placeholder")
  ) {
    return redirectToBilling(request, { error: "plan_not_ready" });
  }

  if (plan.price <= 0) {
    return redirectToBilling(request, { error: "free_plan_checkout_not_required" });
  }

  const baseUrl = getBaseUrl(request).origin;
  const successUrl = `${baseUrl}/settings/billing?checkout=success`;
  const cancelUrl = `${baseUrl}/settings/billing?checkout=cancelled`;

  try {
    const checkout = await createStripeCheckoutSession({
      priceId: plan.stripePriceId,
      mode: plan.interval === "LIFETIME" ? "payment" : "subscription",
      successUrl,
      cancelUrl,
      customerId: subscription?.stripeCustomerId ?? null,
      customerEmail: user.email,
      clientReferenceId: user.id,
      metadata: {
        userId: user.id,
        planId: plan.id,
        planName: plan.name,
      },
      allowPromotionCodes: true,
    });

    void trackGa4ServerEvent({
      eventName: "billing_checkout_session_created",
      userId: user.id,
      params: {
        plan_id: plan.id,
        plan_name: plan.name,
        mode: plan.interval === "LIFETIME" ? "payment" : "subscription",
        had_existing_subscription: Boolean(subscription),
      },
    });

    return NextResponse.redirect(checkout.url, { status: 303 });
  } catch (error) {
    const code =
      error instanceof StripeApiError
        ? error.status >= 500
          ? "stripe_request_failed"
          : "stripe_request_invalid"
        : "checkout_failed";

    void trackGa4ServerEvent({
      eventName: "billing_checkout_session_failed",
      userId: user.id,
      params: {
        plan_id: plan.id,
        plan_name: plan.name,
        error_code: code,
      },
    });

    return redirectToBilling(request, { error: code });
  }
}

