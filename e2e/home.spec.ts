/**
 * @fileoverview E2E tests for home page
 */

import { test, expect } from '@playwright/test';

test.describe('Home Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should display the page title', async ({ page }) => {
    await expect(page).toHaveTitle(/Insight/i);
  });

  test('should display main navigation', async ({ page }) => {
    const nav = page.locator('nav');
    await expect(nav).toBeVisible();
  });

  test('should display hero section', async ({ page }) => {
    const hero = page.locator('[data-testid="hero"], h1');
    await expect(hero.first()).toBeVisible();
  });

  test('should navigate to oracle pages', async ({ page }) => {
    // Look for links to oracle pages
    const oracleLinks = page.locator('a[href*="chainlink"], a[href*="pyth"], a[href*="oracle"]');
    const count = await oracleLinks.count();
    expect(count).toBeGreaterThan(0);
  });

  test('should be responsive', async ({ page }) => {
    // Test mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await expect(page.locator('nav')).toBeVisible();

    // Test desktop viewport
    await page.setViewportSize({ width: 1280, height: 720 });
    await expect(page.locator('nav')).toBeVisible();
  });

  test('should have no console errors', async ({ page }) => {
    const consoleErrors: string[] = [];

    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    expect(consoleErrors).toHaveLength(0);
  });
});
