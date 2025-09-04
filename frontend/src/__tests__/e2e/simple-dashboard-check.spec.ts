import { test, expect } from '@playwright/test';

test('Simple Dashboard Check', async ({ page }) => {
  await page.goto('http://localhost:3000');
  
  // Take a screenshot first to see what's actually rendered
  await page.screenshot({ path: 'dashboard-current-state.png', fullPage: true });
  
  // Get page content
  const content = await page.content();
  console.log('Page Title:', await page.title());
  console.log('URL:', page.url());
  
  // Check if we're on a login page or dashboard
  const hasLoginForm = await page.locator('form, input[type="email"], input[type="password"]').count() > 0;
  const hasDashboardContent = await page.locator('text=Dashboard').count() > 0;
  const hasStatsContent = await page.locator('text=Total Requests, text=Active Partners').count() > 0;
  
  console.log('Has login form:', hasLoginForm);
  console.log('Has dashboard content:', hasDashboardContent);
  console.log('Has stats content:', hasStatsContent);
  
  // Get all text content to see what's actually on the page
  const bodyText = await page.locator('body').textContent();
  console.log('Page text (first 500 chars):', bodyText?.substring(0, 500));
  
  // Look for any numbers that could be the stats
  const numbers = bodyText?.match(/\b\d+\b/g);
  console.log('All numbers on page:', numbers);
  
  // Check for the specific hardcoded values
  const hasOldValue47 = bodyText?.includes('47');
  const hasOldValue23 = bodyText?.includes('23');
  const hasOldValue8 = bodyText?.includes('8');
  const hasOldValue31 = bodyText?.includes('31');
  
  console.log('Still has old values:', { 
    '47': hasOldValue47, 
    '23': hasOldValue23, 
    '8': hasOldValue8, 
    '31': hasOldValue31 
  });
});