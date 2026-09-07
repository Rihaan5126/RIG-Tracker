import { test, expect } from '@playwright/test';
test.describe.serial('RIGtracker workspace journeys', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.getByRole('button', { name: 'Explore the fictional demo' }).click();
    await expect(page.getByRole('heading', { name: 'Overview', exact: true })).toBeVisible();
  });
  test('profile lookup, history filters, and unsupported Stories', async ({ page }) => {
    await page
      .getByRole('textbox', { name: 'Search Instagram username', exact: true })
      .fill('rigtracker_demo');
    await page
      .getByRole('textbox', { name: 'Search Instagram username', exact: true })
      .press('Enter');
    await expect(page.getByRole('heading', { name: 'RIG Studio', exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'History', exact: true }).click();
    await page.getByRole('button', { name: '1Y', exact: true }).click();
    await page.getByRole('button', { name: 'Biography', exact: true }).click();
    await expect(
      page.getByRole('heading', { name: 'biography', exact: true }).first(),
    ).toBeVisible();
    await page.getByRole('button', { name: 'Stories', exact: true }).click();
    await expect(
      page.getByText('Third-party Story retrieval is not supported', { exact: false }),
    ).toBeVisible();
    await page
      .getByRole('textbox', { name: 'Search Instagram username', exact: true })
      .fill('unavailable_person');
    await page
      .getByRole('textbox', { name: 'Search Instagram username', exact: true })
      .press('Enter');
    await expect(page.getByRole('heading', { name: '@unavailable_person' })).toBeVisible();
    await expect(page.getByText('Capability unavailable')).toBeVisible();
  });
  test('creates, pauses, resumes and removes a tracker', async ({ page }) => {
    await page.getByRole('link', { name: /^Tracker/ }).click();
    await expect(page.getByRole('heading', { name: 'Tracker', exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Track account', exact: true }).click();
    await page.getByLabel('Account', { exact: true }).selectOption('offgrid_demo');
    await page.getByRole('button', { name: 'Start tracking', exact: true }).click();
    await expect(page.getByRole('dialog')).not.toBeVisible();
    await page.getByRole('button', { name: 'Pause offgrid_demo', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Resume offgrid_demo' })).toBeVisible();
    await page.getByRole('button', { name: 'Resume offgrid_demo' }).click();
    await page.getByRole('button', { name: 'Remove tracker offgrid_demo' }).click();
    await page.getByRole('button', { name: 'Remove tracker', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Pause offgrid_demo' })).not.toBeVisible();
  });
  test('compares accounts, saves notes, and cleans links', async ({ page }) => {
    await page.getByRole('link', { name: 'Compare', exact: true }).first().click();
    await expect(page.getByRole('heading', { name: 'Side-by-side intelligence' })).toBeVisible();
    await page.getByRole('link', { name: 'Saved Accounts', exact: true }).click();
    await page.getByRole('button', { name: 'Edit notes', exact: true }).first().click();
    await page.getByLabel('Research notes').fill('A useful research note from the browser test.');
    await page.getByRole('button', { name: 'Save account', exact: true }).click();
    await expect(page.getByText('A useful research note from the browser test.')).toBeVisible();
    await page.reload();
    await expect(page.getByText('A useful research note from the browser test.')).toBeVisible();
    await page.getByRole('link', { name: 'Link Inspector', exact: true }).click();
    await page.getByRole('button', { name: 'Try a sample reel', exact: false }).click();
    await page.getByRole('button', { name: 'Inspect link', exact: true }).click();
    await expect(
      page.getByText('https://www.instagram.com/reel/RIGdemo123/', { exact: true }),
    ).toBeVisible();
    await expect(page.getByText('Not followed · no HTTP requests')).toBeVisible();
  });
  test('renders media analytics and captures desktop layout', async ({ page }) => {
    await page.screenshot({ path: 'docs/screenshots/dashboard-desktop.png', fullPage: true });
    await page.getByRole('link', { name: 'Media Analyzer', exact: true }).click();
    await page.getByRole('button', { name: 'Reels', exact: true }).click();
    await page.locator('.media-card').first().click();
    await expect(page.getByRole('heading', { name: 'Reel analysis' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Performance ratios' })).toBeVisible();
    await page.goto('/profile/rigtracker_demo');
    await page.getByRole('button', { name: 'Analytics', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Posts by weekday' })).toBeVisible();
  });
  test('mobile navigation and content stay within the viewport', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.getByRole('button', { name: 'Open navigation', exact: true }).click();
    await page.getByRole('link', { name: 'Profile Lookup', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Look a little closer.' })).toBeVisible();
    await page.goto('/dashboard');
    await expect(page.getByRole('heading', { name: 'Overview', exact: true })).toBeVisible();
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true);
    await page.screenshot({ path: 'docs/screenshots/dashboard-mobile.png', fullPage: true });
  });
});
