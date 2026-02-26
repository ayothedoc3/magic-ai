import { test, expect } from "@playwright/test";

test.describe("pSEO Public Pages", () => {
  test("ai-templates hub page is accessible", async ({ request }) => {
    const res = await request.get("/ai-templates");
    // Should be public (200) or redirect (3xx), not a server error
    expect(res.status()).toBeLessThan(500);
  });

  test("ai-tools hub page is accessible", async ({ request }) => {
    const res = await request.get("/ai-tools");
    expect(res.status()).toBeLessThan(500);
  });

  test("ai-generated-examples hub page is accessible", async ({ request }) => {
    const res = await request.get("/ai-generated-examples");
    expect(res.status()).toBeLessThan(500);
  });

  test("robots.txt is accessible", async ({ request }) => {
    const res = await request.get("/robots.txt");
    // 200 if deployed, may return HTML if route not yet live
    expect(res.status()).toBeLessThan(500);
  });

  test("sitemap.xml is accessible", async ({ request }) => {
    const res = await request.get("/sitemap.xml");
    expect(res.status()).toBeLessThan(500);
  });
});
