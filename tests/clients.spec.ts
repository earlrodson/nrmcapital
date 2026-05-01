import { test, expect } from '@playwright/test';
import { loginAsAdmin } from './helpers/admin-auth';

test.describe('Admin Clients', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('should navigate to clients list and display table', async ({ page }) => {
    await page.goto('/admin/clients');
    await expect(page).toHaveURL(/\/admin\/clients/);
    
    // Check for page title and description
    await expect(page.locator('h1')).toContainText('Clients');
    await expect(page.locator('text=Manage your client profiles')).toBeVisible();

    // Verify table structure
    await expect(page.locator('table')).toBeVisible();
    await expect(page.locator('th:has-text("Borrower")')).toBeVisible();
    await expect(page.locator('th:has-text("Contact")')).toBeVisible();
    await expect(page.locator('th:has-text("Status")')).toBeVisible();
  });

  test('should search for a client', async ({ page }) => {
    await page.goto('/admin/clients');
    
    // Fill search input
    const searchInput = page.locator('input[placeholder="Search by name or ID..."]');
    await searchInput.fill('NonExistentClient');
    
    // Should show empty state if no match
    // Wait for debounce and network
    await expect(page.locator('text=No borrowers found matching your search')).toBeVisible();
  });

  test('should open new borrower page', async ({ page }) => {
    await page.goto('/admin/clients');
    
    // Click New Borrower button
    await page.click('text=New Borrower');
    
    // Should navigate to /admin/clients/new
    await expect(page).toHaveURL('/admin/clients/new');
    await expect(page.locator('h1')).toContainText('New Borrower Onboarding');
  });
});
