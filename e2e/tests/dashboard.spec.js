const { test, expect } = require('@playwright/test');

test.describe('Recruiter Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard');
  });

  test('should display dashboard page', async ({ page }) => {
    await expect(page.locator('text=Dashboard')).toBeVisible();
  });

  test('should show analytics sections', async ({ page }) => {
    await page.waitForTimeout(1000);
    const charts = page.locator('.recharts-wrapper');
    const count = await charts.count();
    expect(count).toBeGreaterThan(0);
  });

  test('should display candidate data when available', async ({ page }) => {
    await page.waitForTimeout(1000);
    const tables = page.locator('table');
    await expect(tables).toBeVisible();
  });
});
