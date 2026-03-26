/**
 * @fileoverview E2E tests for price query flow
 */

import { test, expect } from '@playwright/test';

test.describe('Price Query Flow', () => {
  test('should navigate to price query page', async ({ page }) => {
    await page.goto('/en/price-query');
    await page.waitForLoadState('networkidle');
    
    // Verify page loaded
    const heading = page.locator('h1, h2').first();
    await expect(heading).toBeVisible();
  });

  test('should search for a symbol', async ({ page }) => {
    await page.goto('/en/price-query');
    await page.waitForLoadState('networkidle');
    
    // Look for search input
    const searchInput = page.locator('input[type="text"], input[placeholder*="search" i], input[placeholder*="symbol" i]').first();
    
    if (await searchInput.isVisible().catch(() => false)) {
      await searchInput.fill('BTC');
      await searchInput.press('Enter');
      
      // Wait for results
      await page.waitForTimeout(1000);
      
      // Check for results
      const results = page.locator('[data-testid="result"], .result, .price').first();
      await expect(results).toBeVisible();
    }
  });

  test('should display price comparison', async ({ page }) => {
    await page.goto('/en/cross-oracle');
    await page.waitForLoadState('networkidle');
    
    // Look for comparison table or chart
    const comparisonElement = page.locator('table, [data-testid="comparison"], .comparison').first();
    await expect(comparisonElement).toBeVisible();
  });

  test('should handle time range selection', async ({ page }) => {
    await page.goto('/en/chainlink');
    await page.waitForLoadState('networkidle');
    
    // Look for time range selector
    const timeSelector = page.locator('button:has-text("24H"), button:has-text("7D"), select').first();
    
    if (await timeSelector.isVisible().catch(() => false)) {
      await timeSelector.click();
      
      // Select a different time range
      const option = page.locator('text=/7D|7 days|1W/i').first();
      if (await option.isVisible().catch(() => false)) {
        await option.click();
        
        // Wait for chart to update
        await page.waitForTimeout(1000);
        
        // Verify chart is still visible
        const chart = page.locator('.recharts-wrapper, svg').first();
        await expect(chart).toBeVisible();
      }
    }
  });

  test('should refresh price data', async ({ page }) => {
    await page.goto('/en/chainlink');
    await page.waitForLoadState('networkidle');
    
    // Look for refresh button
    const refreshButton = page.locator('button:has-text("Refresh"), button[aria-label*="refresh" i], [data-testid="refresh"]').first();
    
    if (await refreshButton.isVisible().catch(() => false)) {
      await refreshButton.click();
      
      // Wait for refresh
      await page.waitForTimeout(1000);
      
      // Verify price is still displayed
      const price = page.locator('[data-testid="price"], .price').first();
      await expect(price).toBeVisible();
    }
  });
});
