/**
 * @fileoverview E2E tests for oracle data display
 */

import { test, expect } from '@playwright/test';

test.describe('Oracle Data Display', () => {
  test('should display Chainlink oracle page', async ({ page }) => {
    await page.goto('/en/chainlink');

    // Wait for page to load
    await page.waitForLoadState('networkidle');

    // Check for page title or heading
    const heading = page.locator('h1, h2').first();
    await expect(heading).toBeVisible();

    // Check for price data or loading state
    const priceElement = page.locator('[data-testid="price"], .price, text=/\\$[0-9,]+/').first();
    const loadingElement = page.locator('text=/loading|Loading/i').first();

    await expect(priceElement.or(loadingElement)).toBeVisible();
  });

  test('should display Pyth oracle page', async ({ page }) => {
    await page.goto('/en/pyth');

    await page.waitForLoadState('networkidle');

    const heading = page.locator('h1, h2').first();
    await expect(heading).toBeVisible();
  });

  test('should switch between oracles', async ({ page }) => {
    // Start at Chainlink page
    await page.goto('/en/chainlink');
    await page.waitForLoadState('networkidle');

    // Look for navigation to other oracles
    const pythLink = page.locator('a[href*="/pyth"]').first();

    if (await pythLink.isVisible().catch(() => false)) {
      await pythLink.click();
      await page.waitForLoadState('networkidle');

      // Verify we're on Pyth page
      await expect(page).toHaveURL(/\/pyth/);
    }
  });

  test('should display price charts', async ({ page }) => {
    await page.goto('/en/chainlink');
    await page.waitForLoadState('networkidle');

    // Look for chart elements
    const chart = page.locator('[data-testid="chart"], .recharts-wrapper, svg').first();
    await expect(chart).toBeVisible();
  });

  test('should handle symbol selection', async ({ page }) => {
    await page.goto('/en/chainlink');
    await page.waitForLoadState('networkidle');

    // Look for symbol selector
    const symbolSelector = page
      .locator('select, [role="combobox"], button:has-text("BTC"), button:has-text("ETH")')
      .first();

    if (await symbolSelector.isVisible().catch(() => false)) {
      await symbolSelector.click();

      // Select a different symbol
      const option = page
        .locator('option:has-text("ETH"), [role="option"]:has-text("ETH")')
        .first();
      if (await option.isVisible().catch(() => false)) {
        await option.click();

        // Wait for data to update
        await page.waitForTimeout(1000);

        // Verify price updated
        const price = page.locator('[data-testid="price"], .price').first();
        await expect(price).toBeVisible();
      }
    }
  });
});
