const { test, expect } = require('@playwright/test');

test.describe('AI Button Working Test', () => {
  test('should successfully test AI button with proper authentication', async ({ page }) => {
    console.log('🎯 Starting comprehensive AI button test');
    
    // Step 1: Navigate to login page
    await page.goto('/');
    console.log('📍 Navigated to home page');
    
    // Step 2: Ensure we're on login page
    await expect(page.locator('h2:text("Sign in to GEP System")')).toBeVisible();
    console.log('✅ Confirmed on login page');
    
    // Step 3: Fill credentials from environment variables
    const testEmail = process.env.TEST_MANAGER_EMAIL || 'manager@gephellas.com';
    const testPassword = process.env.TEST_MANAGER_PASSWORD || 'Manager2024!';
    
    await page.fill('input[type="email"]', testEmail);
    await page.fill('input[type="password"]', testPassword);
    console.log('📝 Filled login credentials from environment');
    
    // Step 4: Submit login form
    await page.click('button[type="submit"]:text("Sign in")');
    console.log('🔑 Clicked Sign in button');
    
    // Step 5: Wait for login to complete and verify we're authenticated
    // Look for dashboard elements or navigation that indicates successful login
    await page.waitForTimeout(3000);
    
    // Check current state
    const currentUrl = page.url();
    console.log(`📍 Current URL after login: ${currentUrl}`);
    
    // Look for signs we're logged in (dashboard content, navigation menu, etc.)
    const loggedInIndicators = [
      page.locator('text=GEP Partner Assignment Dashboard'),
      page.locator('a:text("Customer Requests")'),
      page.locator('nav'),
      page.locator('[role="navigation"]')
    ];
    
    let loginSuccessful = false;
    for (const indicator of loggedInIndicators) {
      if (await indicator.isVisible().catch(() => false)) {
        console.log('✅ Found logged-in indicator');
        loginSuccessful = true;
        break;
      }
    }
    
    if (!loginSuccessful) {
      console.log('⚠️ Login may not have succeeded, checking page content...');
      const pageText = await page.locator('body').textContent();
      console.log(`📝 Page contains login form: ${pageText.includes('Sign in to GEP System')}`);
      
      if (pageText.includes('Sign in to GEP System')) {
        throw new Error('Login failed - still on login page');
      }
    }
    
    // Step 6: Navigate to new request page
    console.log('🧭 Attempting to navigate to /requests/new');
    await page.goto('/requests/new');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    // Step 7: Verify we're on the correct page
    const finalUrl = page.url();
    console.log(`📍 Final URL: ${finalUrl}`);
    
    const pageContent = await page.locator('body').textContent();
    console.log(`📝 Page contains "New Customer Request": ${pageContent.includes('New Customer Request')}`);
    console.log(`📝 Page contains "Generate": ${pageContent.includes('Generate')}`);
    
    // Step 8: Look for the AI button
    const aiButtonSelectors = [
      'button:has-text("Generate with AI")',
      'button:has-text("🤖 Generate with AI")', 
      'button:text("🤖 Generate with AI")',
      'button:has-text("🤖")',
      'button[type="button"]:has-text("Generate")'
    ];
    
    let aiButtonFound = false;
    for (const selector of aiButtonSelectors) {
      const button = page.locator(selector);
      if (await button.isVisible().catch(() => false)) {
        console.log(`✅ Found AI button with selector: ${selector}`);
        const buttonText = await button.textContent();
        console.log(`🔘 Button text: "${buttonText}"`);
        
        // Test clicking the button
        await button.click();
        console.log('🤖 Clicked AI generation button');
        
        // Wait for any response
        await page.waitForTimeout(3000);
        
        // Check if form was populated
        const companyField = page.locator('input[name="name"]');
        if (await companyField.isVisible().catch(() => false)) {
          const companyValue = await companyField.inputValue();
          console.log(`📝 Company field value after AI: "${companyValue}"`);
          
          if (companyValue && companyValue.trim() !== '') {
            console.log('🎉 SUCCESS: AI button populated the form!');
            aiButtonFound = true;
            break;
          }
        }
      }
    }
    
    if (!aiButtonFound) {
      // Take final debug screenshot
      await page.screenshot({ path: 'final-debug.png', fullPage: true });
      console.log('📸 Debug screenshot saved as final-debug.png');
      
      const allButtons = await page.locator('button').allTextContents();
      console.log(`🔘 All buttons on page: ${JSON.stringify(allButtons)}`);
      
      throw new Error('AI button not found or not functional');
    }
    
    console.log('✅ AI button test completed successfully!');
  });
});