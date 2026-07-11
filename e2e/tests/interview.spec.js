const { test, expect } = require('@playwright/test');

test.describe('Interview Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/interview');
    await page.evaluate(() => {
      sessionStorage.setItem('candidateName', 'Test User');
      sessionStorage.setItem('candidateRole', 'Software Developer');
    });
  });

  test('should display interview page', async ({ page }) => {
    await page.goto('/interview');
    await expect(page.locator('text=Interview')).toBeVisible();
  });

  test('should display question card', async ({ page }) => {
    await page.goto('/interview');
    await page.waitForTimeout(2000);
    const question = page.locator('[class*="question"]').first();
    await expect(question).toBeVisible();
  });

  test('should show camera preview', async ({ page }) => {
    await page.goto('/interview');
    const camera = page.locator('video').first();
    await expect(camera).toBeVisible();
  });
});
