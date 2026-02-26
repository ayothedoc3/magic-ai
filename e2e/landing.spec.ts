import { test, expect } from "@playwright/test";

test.describe("Landing Page", () => {
  test("should render the landing page with hero section", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("h1")).toBeVisible();
    await expect(page.getByRole("link", { name: /start creating free/i })).toBeVisible();
  });

  test("should have navigation", async ({ page }) => {
    await page.goto("/");
    const nav = page.locator("nav");
    await expect(nav).toBeVisible();
  });

  test("should have pricing section", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText(/pricing/i).first()).toBeVisible();
  });

  test("should navigate to register page from CTA", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: /start creating free/i }).click();
    await expect(page).toHaveURL(/\/register/);
  });

  test("should navigate to login page", async ({ page }) => {
    await page.goto("/");
    // Use the hero Sign In button specifically
    const heroSection = page.locator("section").first();
    await heroSection.getByRole("link", { name: /sign in/i }).click();
    await expect(page).toHaveURL(/\/login/);
  });
});
