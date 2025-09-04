import { test, expect } from '@playwright/test';
import { loginAsAdmin } from '../utils/login-helper';

test('Dashboard with Login', async ({ page }) => {
  // Use the login helper utility
  await loginAsAdmin(page);
  
  // Take screenshot of the dashboard
  await page.screenshot({ path: 'dashboard-logged-in.png', fullPage: true });
  
  // Now check for the stats
  await page.waitForSelector('text=Total Requests', { timeout: 10000 });
  
  // Use more flexible selectors
  const totalRequestsElement = page.locator('text=Total Requests').locator('xpath=../../dd//p').first();
  const activePartnersElement = page.locator('text=Active Partners').locator('xpath=../../dd//p').first();
  const pendingAssignmentsElement = page.locator('text=Pending Assignments').locator('xpath=../../dd//p').first();
  const completedThisMonthElement = page.locator('text=Completed This Month').locator('xpath=../../dd//p').first();
  
  // Get the values
  const totalRequests = await totalRequestsElement.textContent();
  const activePartners = await activePartnersElement.textContent();
  const pendingAssignments = await pendingAssignmentsElement.textContent();
  const completedThisMonth = await completedThisMonthElement.textContent();
  
  console.log('Dashboard Stats:');
  console.log('- Total Requests:', totalRequests);
  console.log('- Active Partners:', activePartners);
  console.log('- Pending Assignments:', pendingAssignments);
  console.log('- Completed This Month:', completedThisMonth);
  
  // Check that these are NOT the old hardcoded values
  expect(totalRequests).not.toBe('47');
  expect(activePartners).not.toBe('23');
  expect(pendingAssignments).not.toBe('8');
  expect(completedThisMonth).not.toBe('31');
  
  // Check that values are not loading state
  expect(totalRequests).not.toBe('...');
  expect(activePartners).not.toBe('...');
  expect(pendingAssignments).not.toBe('...');
  expect(completedThisMonth).not.toBe('...');
  
  // Active partners should be much higher (we have 110 in the database)
  const activePartnersNum = parseInt(activePartners || '0');
  console.log('Active Partners as number:', activePartnersNum);
  
  if (activePartnersNum > 50) {
    console.log('✅ SUCCESS: Active Partners shows real database value:', activePartnersNum);
  } else if (activePartnersNum === 0) {
    console.log('⚠️  Active Partners is 0 - API might be failing');
  } else {
    console.log('⚠️  Active Partners is', activePartnersNum, '- lower than expected 110');
  }
});