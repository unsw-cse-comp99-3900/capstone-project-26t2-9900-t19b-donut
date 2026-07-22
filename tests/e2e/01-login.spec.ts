import { test, expect } from '@playwright/test';

test.describe('Login Flow', () => {
  test('should login successfully with valid credentials', async ({ page }) => {
    // Navigate to the app
    await page.goto('/login');

    // Wait for the email input to be visible
    const emailInput = page.locator('input[type="email"]');
    await expect(emailInput).toBeVisible();
    
    // Read credentials from env (fallback to dummy for demonstration)
    const email = process.env.MANAGER_EMAIL || 'manager@test.com';
    const password = process.env.MANAGER_PASSWORD || '123456';

    await emailInput.fill(email);
    
    // Fill password
    const passwordInput = page.locator('input[type="password"]');
    await passwordInput.fill(password);

    // Submit form
    const signInButton = page.getByRole('button', { name: /sign in/i });
    await signInButton.click();

    // Verify successful login by checking for redirection to /my-roster or dashboard
    await expect(page).not.toHaveURL(/.*\/login/, { timeout: 30000 });
    
    // Optional: wait for a toast or some indicator
    // const toast = page.getByText(/Welcome back/i);
    // await expect(toast).toBeVisible();
  });

  test('should show error with invalid credentials', async ({ page }) => {
    await page.goto('/login');

    await page.locator('input[type="email"]').fill('invalid@company.com');
    await page.locator('input[type="password"]').fill('wrongpassword');
    await page.getByRole('button', { name: /sign in/i }).click();

    // The error message should appear (Supabase usually says "Invalid login credentials")
    const errorMessage = page.locator('text=/Invalid/i');
    await expect(errorMessage).toBeVisible();
  });
});
