const { test, expect } = require('@playwright/test');

test.describe('Result Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/result');
    await page.evaluate(() => {
      sessionStorage.setItem('interviewResults', JSON.stringify({
        overall: 75,
        technical: 80,
        communication: 70,
        confidence: 75,
        behavior: 72,
        emotion: 78,
      }));
    });
  });

  test('should display result page', async ({ page }) => {
    await page.goto('/result');
    await expect(page.locator('text=75')).toBeVisible();
  });

  test('should display score breakdown', async ({ page }) => {
    await page.goto('/result');
    await page.waitForTimeout(1000);
    const scores = page.locator('[class*="score"]');
    const count = await scores.count();
    expect(count).toBeGreaterThan(0);
  });

  test('should have download PDF button', async ({ page }) => {
    await page.goto('/result');
    const downloadBtn = page.locator('button:has-text("Download")');
    await expect(downloadBtn).toBeVisible();
  });
});
