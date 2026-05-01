import { test, expect } from '@playwright/test';
import { loginAsAdmin } from './helpers/admin-auth';

test.describe('Admin Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('should display dashboard summary cards', async ({ page }) => {
    // Check for essential summary cards
    await expect(page.locator('text=Total Payments')).toBeVisible();
    await expect(page.locator('text=Active Loans')).toBeVisible();
    await expect(page.locator('text=Active Members')).toBeVisible();
    await expect(page.locator('text=Overdue Payments')).toBeVisible();
  });

  test('should display chart and activity', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Welcome back, Admin' })).toBeVisible();
    await expect(page.locator('[data-slot="card-title"]').filter({ hasText: 'Overview' }).first()).toBeVisible();
    
    // Check for Recent Activity section
    await expect(page.locator('text=Recent Activity')).toBeVisible();
  });

  test('should toggle overview granularity', async ({ page }) => {
    // Click Daily
    await page.click('button:has-text("Daily")');
    await expect(page.locator('text=Daily repayment collections')).toBeVisible();

    // Click Yearly
    await page.click('button:has-text("Yearly")');
    await expect(page.locator('text=Yearly repayment collections')).toBeVisible();
    
    // Click Monthly
    await page.click('button:has-text("Monthly")');
    await expect(page.locator('text=Monthly repayment collections')).toBeVisible();
  });
});
