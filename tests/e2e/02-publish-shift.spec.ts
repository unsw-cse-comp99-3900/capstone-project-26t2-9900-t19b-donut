import { test, expect } from '@playwright/test';

test.describe('Publish Shift Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Freeze time to 8:00 AM so that our 09:00-17:00 shift is always in the future.
    // This fixes the "Shift cannot start in the past" validation error.
    await page.clock.setFixedTime(new Date('2026-07-19T08:00:00+10:00'));
    
    // Login as a manager before each test in this block
    await page.goto('/login');
    const email = process.env.MANAGER_EMAIL || 'manager@test.com';
    const password = process.env.MANAGER_PASSWORD || '123456';
    
    await page.getByRole('textbox', { name: 'name@company.com' }).fill(email);
    await page.getByRole('textbox', { name: 'Enter your password' }).fill(password);
    await page.getByRole('button', { name: 'Sign In' }).click();
    await expect(page).not.toHaveURL(/.*\/login/);
  });

  test('Manager can create and publish a new shift', async ({ page }) => {
    // 1. Navigate to Rosters page
    await page.getByRole('link', { name: 'Rosters Manage schedules' }).click();
    
    // Hide the performance monitor that intercepts clicks in the bottom right corner
    await page.addStyleTag({ content: 'button[aria-label="Open performance monitor"] { display: none !important; }' });
    
    // 2. Activate DnD Mode (hand icon)
    await page.locator('button:nth-child(11)').click();
    
    // 3. Click the + button in the grid to add shift
    await page.getByRole('button', { name: 'Add Shift' }).nth(2).click();
    
    // 4. Wizard Step 1: Select Role
    await page.getByRole('combobox').click();
    await page.getByRole('option', { name: 'Staff' }).click();
    await page.getByRole('button', { name: 'Next' }).click(); // Go to Step 2
    
    // 5. Wizard Step 2: Requirements
    await page.getByRole('button', { name: 'Next' }).click(); // Go to Step 3
    
    // 6. Wizard Step 3: Timings
    await page.getByPlaceholder('HH:MM').first().fill('09:00');
    await page.getByPlaceholder('HH:MM').nth(1).fill('17:00');
    await page.getByRole('button', { name: 'Next' }).click(); // Go to Step 4
    
    // 7. Wizard Step 4: Assignment
    await page.getByRole('button', { name: 'Select Employee' }).click();
    await page.getByRole('option', { name: '— Leave Unassigned open for' }).click();
    await page.getByRole('button', { name: 'Next' }).click(); // Go to Step 5
    
    // 8. Wizard Step 5: Compliance and Create
    await page.locator('#shift-form').getByRole('button', { name: 'Run Compliance' }).click();
    await page.getByRole('button', { name: 'Create Shift' }).click();
    
    // Wait for the modal to close / shift to be created
    await expect(page.getByRole('button', { name: 'Create Shift' })).toBeHidden({ timeout: 10000 });
  });
});
