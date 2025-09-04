import { Page } from '@playwright/test';

export async function loginAsAdmin(page: Page): Promise<void> {
  // Navigate to login page if not already there
  await page.goto('http://localhost:3000');
  
  // Wait for login page to load
  await page.waitForSelector('text=Sign in to GEP System', { timeout: 10000 });
  console.log('✓ Login page loaded');
  
  // Click the "Login as Admin" demo button to auto-fill credentials
  const adminLoginButton = page.locator('text=👤Login as Admin');
  if (await adminLoginButton.count() > 0) {
    console.log('✓ Clicking Admin demo login button');
    await adminLoginButton.click();
    
    // Wait a moment for credentials to be filled
    await page.waitForTimeout(1000);
  } else {
    // Fallback to manual credential entry
    console.log('✓ Manually entering admin credentials');
    await page.fill('input[type="email"]', 'admin@gephellas.com');
    await page.fill('input[type="password"]', 'GEPAdmin2024!');
  }
  
  // Click the actual "Sign in" button to submit the form
  const signInButton = page.locator('button:has-text("Sign in"), button[type="submit"]');
  console.log('✓ Clicking Sign in button');
  await signInButton.click();
  
  // Wait for dashboard to load (or any redirect)
  try {
    await page.waitForSelector('text=GEP Partner Assignment Dashboard', { timeout: 15000 });
    console.log('✅ Successfully logged in - Dashboard loaded');
  } catch (error) {
    // If dashboard doesn't load, take a screenshot to see what happened
    await page.screenshot({ path: 'login-failed-state.png' });
    const currentUrl = page.url();
    const pageText = await page.locator('body').textContent();
    console.log('❌ Login may have failed. Current URL:', currentUrl);
    console.log('Page content:', pageText?.substring(0, 300));
    throw error;
  }
}