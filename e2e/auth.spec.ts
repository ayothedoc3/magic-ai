import { test, expect } from "@playwright/test";

test.describe("Authentication", () => {
  test("login page renders correctly", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByText("Sign in to your account")).toBeVisible();
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.getByRole("button", { name: /sign in/i })).toBeVisible();
  });

  test("register page renders correctly", async ({ page }) => {
    await page.goto("/register");
    await expect(page.getByText("Create your account")).toBeVisible();
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]').first()).toBeVisible();
    await expect(
      page.getByRole("button", { name: /create account/i })
    ).toBeVisible();
  });

  test("login page has link to register", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByRole("link", { name: /register|sign up|create/i })).toBeVisible();
  });

  test("register page has link to login", async ({ page }) => {
    await page.goto("/register");
    await expect(page.getByRole("link", { name: /sign in|log in/i })).toBeVisible();
  });

  test("login with empty fields shows validation", async ({ page }) => {
    await page.goto("/login");
    await page.getByRole("button", { name: /sign in/i }).click();
    // HTML5 validation prevents submission — page stays on /login
    await expect(page).toHaveURL(/\/login/);
  });

  test.describe("Protected routes redirect to login", () => {
    const protectedRoutes = [
      "/dashboard",
      "/chat",
      "/generate",
      "/images",
      "/video",
      "/documents",
      "/settings",
    ];

    for (const route of protectedRoutes) {
      test(`${route} redirects to /login`, async ({ page }) => {
        await page.goto(route);
        await expect(page).toHaveURL(/\/login/);
      });
    }
  });
});
