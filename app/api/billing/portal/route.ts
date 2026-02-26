import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  StripeApiError,
  createStripeBillingPortalSession,
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

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return redirectToBilling(request, { error: "unauthorized" });
  }

  if (!isStripeServerConfigured()) {
    return redirectToBilling(request, { error: "stripe_not_configured" });
  }

  const subscription = await prisma.subscription.findUnique({
    where: { userId: session.user.id },
    select: {
      stripeCustomerId: true,
      stripeSubscriptionId: true,
      status: true,
      userId: true,
    },
  });

  if (!subscription?.stripeCustomerId) {
    return redirectToBilling(request, { error: "no_billing_portal_customer" });
  }

  try {
    const baseUrl = getBaseUrl(request).origin;
    const portal = await createStripeBillingPortalSession({
      customerId: subscription.stripeCustomerId,
      returnUrl: `${baseUrl}/settings/billing?portal=returned`,
    });

    void trackGa4ServerEvent({
      eventName: "billing_portal_session_created",
      userId: subscription.userId,
      params: {
        subscription_status: subscription.status,
        has_stripe_subscription_id: Boolean(subscription.stripeSubscriptionId),
      },
    });

    return NextResponse.redirect(portal.url, { status: 303 });
  } catch (error) {
    const code =
      error instanceof StripeApiError
        ? error.status >= 500
          ? "stripe_portal_failed"
          : "stripe_portal_invalid"
        : "portal_failed";

    void trackGa4ServerEvent({
      eventName: "billing_portal_session_failed",
      userId: subscription.userId,
      params: {
        subscription_status: subscription.status,
        error_code: code,
      },
    });

    return redirectToBilling(request, { error: code });
  }
}

