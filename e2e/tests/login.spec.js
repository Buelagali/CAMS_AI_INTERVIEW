const { test, expect } = require('@playwright/test');

test.describe('Login Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should display login form', async ({ page }) => {
    await expect(page.locator('form')).toBeVisible();
    await expect(page.locator('input[type="text"]').first()).toBeVisible();
    await expect(page.locator('button[type="submit"]').first()).toBeVisible();
  });

  test('should show error with empty fields', async ({ page }) => {
    await page.click('button[type="submit"]');
    await expect(page.locator('text=required')).toBeVisible();
  });

  test('should proceed to upload page with valid input', async ({ page }) => {
    await page.fill('input[type="text"]').first().fill('Test Candidate');
    await page.fill('input[type="email"]').fill('test@example.com');
    await page.selectOption('select', 'Software Developer');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/\/upload/);
  });
});
