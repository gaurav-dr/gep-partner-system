import { test, expect } from '@playwright/test';

test('should load dashboard page and verify all stats after admin login', async ({ page }) => {
  await page.goto('http://localhost:3000/');

  await page.fill('input[type="email"]', 'admin@gephellas.com');
  await page.fill('input[type="password"]', 'GEPAdmin2024!');
  await page.click('button[type="submit"]');

  await page.waitForURL('http://localhost:3000/');
  
  await expect(page.locator('[data-testid="total-requests"]')).toBeVisible();
  await expect(page.locator('[data-testid="active-partners"]')).toBeVisible();
  await expect(page.locator('[data-testid="pending-assignments"]')).toBeVisible();
  await expect(page.locator('[data-testid="completed-this-month"]')).toBeVisible();

  // Wait for data to load (not showing "...")
  await page.waitForFunction(() => {
    const totalRequests = document.querySelector('[data-testid="total-requests"]')?.textContent;
    return totalRequests && totalRequests !== '...';
  });

  const totalRequests = await page.locator('[data-testid="total-requests"]').textContent();
  const activePartners = await page.locator('[data-testid="active-partners"]').textContent();
  const pendingAssignments = await page.locator('[data-testid="pending-assignments"]').textContent();
  const completedThisMonth = await page.locator('[data-testid="completed-this-month"]').textContent();

  console.log('Total Requests:', totalRequests);
  console.log('Active Partners:', activePartners);
  console.log('Pending Assignments:', pendingAssignments);
  console.log('Completed This Month:', completedThisMonth);

  expect(totalRequests).toMatch(/^\d+$/);
  expect(activePartners).toMatch(/^\d+$/);
  expect(pendingAssignments).toMatch(/^\d+$/);
  expect(completedThisMonth).toMatch(/^\d+$/);
});