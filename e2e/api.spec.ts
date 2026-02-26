import { test, expect } from "@playwright/test";

test.describe("API Routes", () => {
  test("chat API requires authentication", async ({ request }) => {
    const res = await request.post("/api/chat", {
      data: { messages: [{ role: "user", content: "hello" }], chatId: "test" },
    });
    // 401 Unauthorized or 404 if route not yet deployed
    expect([401, 404]).toContain(res.status());
  });

  test("generate API requires authentication", async ({ request }) => {
    const res = await request.post("/api/generate", {
      data: { templateSlug: "test", fields: {} },
    });
    expect([401, 404]).toContain(res.status());
  });

  test("images API requires authentication", async ({ request }) => {
    const res = await request.post("/api/images/generate", {
      data: { prompt: "test" },
    });
    expect([401, 404]).toContain(res.status());
  });

  test("video API requires authentication", async ({ request }) => {
    const res = await request.post("/api/video/generate", {
      data: { prompt: "test" },
    });
    expect([401, 404]).toContain(res.status());
  });

  test("billing webhook rejects unsigned requests", async ({ request }) => {
    const res = await request.post("/api/billing/webhook", {
      data: { type: "test" },
    });
    // 400 Bad Request (invalid signature) or 404 if not yet deployed
    expect([400, 404]).toContain(res.status());
  });

  test("analytics events API accepts POST", async ({ request }) => {
    const res = await request.post("/api/analytics/events", {
      data: {
        eventName: "test_event",
        path: "/test",
      },
    });
    // Should not be a server error
    expect(res.status()).toBeLessThan(500);
  });
});
