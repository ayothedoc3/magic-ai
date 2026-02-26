import "server-only";

type StripeCheckoutMode = "subscription" | "payment";

type StripeCheckoutSessionArgs = {
  priceId: string;
  successUrl: string;
  cancelUrl: string;
  mode?: StripeCheckoutMode;
  customerId?: string | null;
  customerEmail?: string | null;
  clientReferenceId?: string | null;
  metadata?: Record<string, string | null | undefined>;
  allowPromotionCodes?: boolean;
};

type StripeBillingPortalSessionArgs = {
  customerId: string;
  returnUrl: string;
};

class StripeApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "StripeApiError";
    this.status = status;
  }
}

function getStripeSecretKey() {
  const secretKey = process.env.STRIPE_SECRET_KEY?.trim();
  if (!secretKey) {
    throw new StripeApiError("STRIPE_SECRET_KEY is not configured", 500);
  }
  return secretKey;
}

function safeStripeString(value: string | null | undefined, maxLength = 500) {
  if (!value) return undefined;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, maxLength) : undefined;
}

async function stripeFormPost(
  path: string,
  params: URLSearchParams
): Promise<Record<string, unknown>> {
  const secretKey = getStripeSecretKey();

  const response = await fetch(`https://api.stripe.com/v1/${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secretKey}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params.toString(),
    cache: "no-store",
  });

  let payload: Record<string, unknown> = {};
  try {
    payload = (await response.json()) as Record<string, unknown>;
  } catch {
    payload = {};
  }

  if (!response.ok) {
    const errorObject =
      payload && typeof payload.error === "object"
        ? (payload.error as Record<string, unknown>)
        : null;
    const message =
      safeStripeString(
        typeof errorObject?.message === "string" ? errorObject.message : null,
        200
      ) ??
      safeStripeString(
        typeof payload.error === "string" ? payload.error : null,
        200
      ) ??
      "Stripe request failed";

    throw new StripeApiError(message, response.status);
  }

  return payload;
}

export function isStripeServerConfigured() {
  return Boolean(process.env.STRIPE_SECRET_KEY?.trim());
}

export async function createStripeCheckoutSession(
  args: StripeCheckoutSessionArgs
) {
  const params = new URLSearchParams();

  params.set("mode", args.mode ?? "subscription");
  params.set("success_url", args.successUrl);
  params.set("cancel_url", args.cancelUrl);
  params.set("line_items[0][price]", args.priceId);
  params.set("line_items[0][quantity]", "1");

  if (args.allowPromotionCodes !== false) {
    params.set("allow_promotion_codes", "true");
  }

  const customerId = safeStripeString(args.customerId, 100);
  const customerEmail = safeStripeString(args.customerEmail, 200);
  const clientReferenceId = safeStripeString(args.clientReferenceId, 200);

  if (customerId) {
    params.set("customer", customerId);
  } else if (customerEmail) {
    params.set("customer_email", customerEmail);
  }

  if (clientReferenceId) {
    params.set("client_reference_id", clientReferenceId);
  }

  if (args.metadata) {
    for (const [key, value] of Object.entries(args.metadata)) {
      const metadataValue = safeStripeString(value, 500);
      if (!metadataValue) continue;
      params.set(`metadata[${key}]`, metadataValue);
      if (args.mode !== "payment") {
        params.set(`subscription_data[metadata][${key}]`, metadataValue);
      }
    }
  }

  const payload = await stripeFormPost("checkout/sessions", params);
  const url =
    typeof payload.url === "string" && payload.url.startsWith("http")
      ? payload.url
      : null;

  if (!url) {
    throw new StripeApiError("Stripe did not return a checkout URL", 502);
  }

  return {
    id: typeof payload.id === "string" ? payload.id : null,
    url,
  };
}

export async function createStripeBillingPortalSession(
  args: StripeBillingPortalSessionArgs
) {
  const params = new URLSearchParams();
  params.set("customer", args.customerId);
  params.set("return_url", args.returnUrl);

  const payload = await stripeFormPost("billing_portal/sessions", params);
  const url =
    typeof payload.url === "string" && payload.url.startsWith("http")
      ? payload.url
      : null;

  if (!url) {
    throw new StripeApiError("Stripe did not return a billing portal URL", 502);
  }

  return {
    url,
  };
}

export async function stripeApiGet(
  path: string
): Promise<Record<string, unknown>> {
  const secretKey = getStripeSecretKey();

  const response = await fetch(`https://api.stripe.com/v1/${path}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${secretKey}`,
    },
    cache: "no-store",
  });

  let payload: Record<string, unknown> = {};
  try {
    payload = (await response.json()) as Record<string, unknown>;
  } catch {
    payload = {};
  }

  if (!response.ok) {
    const errorObject =
      payload && typeof payload.error === "object"
        ? (payload.error as Record<string, unknown>)
        : null;
    const message =
      safeStripeString(
        typeof errorObject?.message === "string" ? errorObject.message : null,
        200
      ) ?? "Stripe GET request failed";

    throw new StripeApiError(message, response.status);
  }

  return payload;
}

export { StripeApiError };

