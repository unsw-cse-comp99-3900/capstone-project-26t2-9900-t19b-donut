import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

const WCAG_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];

const auditPage = async (page: Page, name: string) => {
  const { violations } = await new AxeBuilder({ page })
    .exclude('button[aria-label="Open performance monitor"]')
    .withTags(WCAG_TAGS)
    .analyze();

  return violations.map(({ id, impact, help, nodes }) => ({
    page: name,
    rule: id,
    impact,
    help,
    targets: nodes.map(({ target }) => target.join(' ')),
    fixes: nodes.map(({ failureSummary }) => failureSummary),
  }));
};

test('top five pages have no automated WCAG A/AA violations', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'Google Chrome', 'Run the axe audit once in desktop Chrome.');

  const findings = [];

  await page.goto('/login');
  await expect(page.getByRole('textbox', { name: 'Email address' })).toBeVisible();
  await page.waitForTimeout(1_000);
  findings.push(...await auditPage(page, 'Login'));

  await page.getByRole('textbox', { name: 'Email address' })
    .fill(process.env.MANAGER_EMAIL || 'manager@test.com');
  await page.getByRole('textbox', { name: 'Password' })
    .fill(process.env.MANAGER_PASSWORD || '123456');
  await page.getByRole('button', { name: 'Sign In' }).click();
  await expect(page).not.toHaveURL(/\/login/, { timeout: 30_000 });

  for (const [name, path] of [
    ['My Roster', '/my-roster'],
    ['Availability', '/my-availabilities'],
    ['Employee Bids', '/my-bids'],
    ['Timesheet', '/timesheet'],
  ] as const) {
    await page.goto(path);
    await expect(page).toHaveURL(new RegExp(`${path.replace('/', '\\/')}(?:$|\\?)`));
    await expect(page.locator('body')).toBeVisible();
    await expect(page.getByText('Access Denied')).toBeHidden();
    await page.waitForTimeout(3_000);
    findings.push(...await auditPage(page, name));
  }

  expect(findings, JSON.stringify(findings, null, 2)).toEqual([]);
});
