import { prisma } from "@/lib/prisma";
import { stripeApiGet } from "@/lib/stripe";
import { verifyStripeWebhookSignature } from "@/lib/stripe-webhook";
import { parseCredits } from "@/lib/credits";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const rawBody = await req.text();
  const signature = req.headers.get("stripe-signature");

  if (!signature) {
    return Response.json({ error: "Missing signature" }, { status: 400 });
  }

  const secret = process.env.STRIPE_WEBHOOK_SECRET?.trim();
  if (!secret) {
    console.error("STRIPE_WEBHOOK_SECRET not configured");
    return Response.json({ error: "Webhook not configured" }, { status: 500 });
  }

  let event: Record<string, unknown>;
  try {
    event = verifyStripeWebhookSignature(rawBody, signature, secret);
  } catch (err) {
    console.error("Webhook verification failed:", err);
    return Response.json({ error: "Invalid signature" }, { status: 400 });
  }

  const eventType = event.type as string;
  const data = event.data as { object: Record<string, unknown> };

  try {
    switch (eventType) {
      case "checkout.session.completed":
        await handleCheckoutCompleted(data.object);
        break;
      case "customer.subscription.updated":
        await handleSubscriptionUpdated(data.object);
        break;
      case "customer.subscription.deleted":
        await handleSubscriptionDeleted(data.object);
        break;
      case "invoice.payment_succeeded":
        await handlePaymentSucceeded(data.object);
        break;
      case "invoice.payment_failed":
        await handlePaymentFailed(data.object);
        break;
      default:
        // Unhandled event type — acknowledge it
        break;
    }
  } catch (err) {
    console.error(`Webhook handler error for ${eventType}:`, err);
    return Response.json({ error: "Handler error" }, { status: 500 });
  }

  return Response.json({ received: true });
}

async function handleCheckoutCompleted(session: Record<string, unknown>) {
  const subscriptionId = session.subscription as string | null;
  const customerId = session.customer as string | null;
  const metadata = session.metadata as Record<string, string> | null;
  const userId = metadata?.userId || (session.client_reference_id as string | null);

  if (!subscriptionId || !customerId || !userId) return;

  // Fetch subscription details from Stripe
  const sub = await stripeApiGet(`subscriptions/${subscriptionId}`);
  const items = sub.items as { data: Array<{ price: { id: string } }> } | null;
  const priceId = items?.data?.[0]?.price?.id;

  if (!priceId) return;

  // Find the plan
  const plan = await prisma.plan.findUnique({ where: { stripePriceId: priceId } });
  if (!plan) {
    console.error(`No plan found for priceId: ${priceId}`);
    return;
  }

  // Upsert subscription
  await prisma.subscription.upsert({
    where: { userId },
    create: {
      userId,
      planId: plan.id,
      stripeCustomerId: customerId,
      stripeSubscriptionId: subscriptionId,
      status: "ACTIVE",
      currentPeriodStart: new Date((sub.current_period_start as number) * 1000),
      currentPeriodEnd: new Date((sub.current_period_end as number) * 1000),
    },
    update: {
      planId: plan.id,
      stripeCustomerId: customerId,
      stripeSubscriptionId: subscriptionId,
      status: "ACTIVE",
      currentPeriodStart: new Date((sub.current_period_start as number) * 1000),
      currentPeriodEnd: new Date((sub.current_period_end as number) * 1000),
      cancelAtPeriodEnd: false,
    },
  });

  // Set user credits from plan
  const planCredits = parseCredits(plan.credits);
  await prisma.user.update({
    where: { id: userId },
    data: { credits: planCredits },
  });
}

async function handleSubscriptionUpdated(sub: Record<string, unknown>) {
  const subscriptionId = sub.id as string;
  const status = mapStripeStatus(sub.status as string);
  const cancelAtPeriodEnd = sub.cancel_at_period_end as boolean;

  const existing = await prisma.subscription.findUnique({
    where: { stripeSubscriptionId: subscriptionId },
  });
  if (!existing) return;

  // Check if plan changed
  const items = sub.items as { data: Array<{ price: { id: string } }> } | null;
  const priceId = items?.data?.[0]?.price?.id;
  let planId = existing.planId;

  if (priceId) {
    const plan = await prisma.plan.findUnique({ where: { stripePriceId: priceId } });
    if (plan) planId = plan.id;
  }

  await prisma.subscription.update({
    where: { stripeSubscriptionId: subscriptionId },
    data: {
      status,
      planId,
      cancelAtPeriodEnd,
      currentPeriodStart: new Date((sub.current_period_start as number) * 1000),
      currentPeriodEnd: new Date((sub.current_period_end as number) * 1000),
    },
  });
}

async function handleSubscriptionDeleted(sub: Record<string, unknown>) {
  const subscriptionId = sub.id as string;

  await prisma.subscription.updateMany({
    where: { stripeSubscriptionId: subscriptionId },
    data: { status: "CANCELED" },
  });
}

async function handlePaymentSucceeded(invoice: Record<string, unknown>) {
  const billingReason = invoice.billing_reason as string;
  const subscriptionId = invoice.subscription as string | null;

  // Only refresh credits on renewal cycles, not initial payment
  if (billingReason !== "subscription_cycle" || !subscriptionId) return;

  const subscription = await prisma.subscription.findUnique({
    where: { stripeSubscriptionId: subscriptionId },
    include: { plan: true },
  });
  if (!subscription) return;

  // Refresh credits from plan
  const planCredits = parseCredits(subscription.plan.credits);
  await prisma.user.update({
    where: { id: subscription.userId },
    data: { credits: planCredits },
  });

  // Update subscription status
  await prisma.subscription.update({
    where: { stripeSubscriptionId: subscriptionId },
    data: { status: "ACTIVE" },
  });
}

async function handlePaymentFailed(invoice: Record<string, unknown>) {
  const subscriptionId = invoice.subscription as string | null;
  if (!subscriptionId) return;

  await prisma.subscription.updateMany({
    where: { stripeSubscriptionId: subscriptionId },
    data: { status: "PAST_DUE" },
  });
}

function mapStripeStatus(stripeStatus: string): "ACTIVE" | "CANCELED" | "PAST_DUE" | "TRIALING" | "UNPAID" {
  switch (stripeStatus) {
    case "active":
      return "ACTIVE";
    case "canceled":
      return "CANCELED";
    case "past_due":
      return "PAST_DUE";
    case "trialing":
      return "TRIALING";
    case "unpaid":
      return "UNPAID";
    default:
      return "ACTIVE";
  }
}
