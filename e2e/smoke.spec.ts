import { expect, test } from '@playwright/test';

test('public health endpoint exposes diagnostics', async ({ request }) => {
  const response = await request.get('/api/v1/health');
  expect(response.ok()).toBeTruthy();
  expect(response.headers()['x-request-id']).toBeTruthy();
  expect(response.headers()['server-timing']).toContain('app;dur=');
  await expect(response.json()).resolves.toMatchObject({
    success: true,
    data: { status: 'ok', version: 'v1' },
  });
});

test('protected settings preserve the return destination', async ({ page }) => {
  await page.goto('/settings?tab=billing');
  await expect(page).toHaveURL(/\/login\?redirect=%2Fsettings%3Ftab%3Dbilling/);
});

test('login and API documentation render', async ({ page }) => {
  await page.goto('/login');
  await expect(page).toHaveTitle(/Login|Sign in/i);

  const openapi = await page.request.get('/openapi.yaml');
  expect(openapi.ok()).toBeTruthy();
  expect(await openapi.text()).toContain('Insight Oracle Risk & Transparency API');
});
