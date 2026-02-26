import "server-only";
import { createHmac, timingSafeEqual } from "crypto";

const TOLERANCE_SECONDS = 300; // 5 minutes

export function verifyStripeWebhookSignature(
  rawBody: string,
  signatureHeader: string,
  secret: string
): Record<string, unknown> {
  const parts = signatureHeader.split(",").reduce(
    (acc, part) => {
      const [key, value] = part.split("=");
      if (key === "t") acc.timestamp = value;
      if (key === "v1") acc.signatures.push(value);
      return acc;
    },
    { timestamp: "", signatures: [] as string[] }
  );

  if (!parts.timestamp || parts.signatures.length === 0) {
    throw new Error("Invalid Stripe signature header");
  }

  const timestamp = parseInt(parts.timestamp, 10);
  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - timestamp) > TOLERANCE_SECONDS) {
    throw new Error("Stripe webhook timestamp too old");
  }

  const signedPayload = `${parts.timestamp}.${rawBody}`;
  const expectedSignature = createHmac("sha256", secret)
    .update(signedPayload)
    .digest("hex");

  const isValid = parts.signatures.some((sig) => {
    try {
      return timingSafeEqual(
        Buffer.from(expectedSignature),
        Buffer.from(sig)
      );
    } catch {
      return false;
    }
  });

  if (!isValid) {
    throw new Error("Stripe webhook signature verification failed");
  }

  return JSON.parse(rawBody) as Record<string, unknown>;
}
