import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {
  test('should show error with invalid credentials', async ({ page }) => {
    await page.goto('/login');
    
    await page.fill('#email', 'wrong@example.com');
    await page.fill('#password', 'wrongpassword');
    await page.click('button[type="submit"]');
    
    // Check for error message
    const errorAlert = page.locator('.bg-destructive\\/10');
    await expect(errorAlert).toBeVisible();
    await expect(errorAlert).toContainText('Invalid credentials');
  });

  test('should login successfully with valid credentials', async ({ page }) => {
    await page.goto('/login');
    
    // Using default admin credentials from seed script
    await page.fill('#email', 'admin@nrmcapital.com');
    await page.fill('#password', 'Admin123!ChangeMe');
    await page.click('button[type="submit"]');
    
    // Should redirect to dashboard
    await expect(page).toHaveURL('/admin/dashboard');
    await expect(page.locator('h1')).toContainText('Welcome back, Admin');
  });

  test('should logout successfully', async ({ page }) => {
    // Login first
    await page.goto('/login');
    await page.fill('#email', 'admin@nrmcapital.com');
    await page.fill('#password', 'Admin123!ChangeMe');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('/admin/dashboard');

    // Open user menu
    await page.click('button.relative.h-8.w-8.rounded-full'); // Avatar button
    
    // Click Logout
    await page.click('text=Log out');
    
    // Should redirect to login
    await expect(page).toHaveURL('/login');
    await expect(page.locator('h1')).toContainText('Welcome back');
  });
});
