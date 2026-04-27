import { test, expect } from '@playwright/test';

test.describe('Admin Clients', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto('/login');
    await page.fill('#email', 'admin@nrmcapital.com');
    await page.fill('#password', 'Admin123!ChangeMe');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('/admin/dashboard');
  });

  test('should navigate to clients list and display table', async ({ page }) => {
    // Navigate to clients page
    await page.click('text=Clients');
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
    await expect(page.locator('h1')).toContainText('Onboard New Borrower');
  });
});
