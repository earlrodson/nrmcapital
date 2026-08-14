import { test, expect } from '@playwright/test';
import { loginAsAdmin } from './helpers/admin-auth';

test.describe('Authentication', () => {
  test('should show error with invalid credentials', async ({ page }) => {
    await page.goto('/login');
    
    await page.fill('#identifier', 'wrong@example.com');
    await page.fill('#password', 'wrongpassword');
    await page.click('button[type="submit"]');
    
    // Check for error message
    const errorAlert = page.locator('.bg-destructive\\/10');
    await expect(errorAlert).toBeVisible();
    await expect(errorAlert).toContainText('Invalid credentials');
  });

  test('should login successfully with valid credentials', async ({ page }) => {
    await loginAsAdmin(page);
    await expect(page.locator('h1')).toContainText('Welcome back, Admin');
  });

  test('should logout successfully', async ({ page }) => {
    await loginAsAdmin(page);

    // Open user menu
    await page.click('button.relative.h-8.w-8.rounded-full'); // Avatar button
    
    // Click Logout
    await page.click('text=Log out');
    
    // Should redirect to login
    await expect(page).toHaveURL('/login');
    await expect(page.locator('h1')).toContainText('Welcome back');
  });
});
