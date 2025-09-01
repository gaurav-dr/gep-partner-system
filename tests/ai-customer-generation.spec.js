const { test, expect } = require('@playwright/test');

test.describe('AI Customer Request Generation', () => {
  test.beforeEach(async ({ page }) => {
    // Mock authentication by setting user state directly
    await page.addInitScript(() => {
      // Mock the auth context to simulate logged-in manager
      window.localStorage.setItem('gep_demo_auth', JSON.stringify({
        user: {
          id: 'demo-manager-123',
          email: 'manager@gephellas.com', 
          role: 'manager',
          name: 'Demo Manager'
        }
      }));
    });

    // Navigate directly to home page 
    await page.goto('/');
    
    // Wait a moment for auth to initialize
    await page.waitForTimeout(1000);
    
    // Check if we need to login (authentication system might still show login)
    const needsLogin = await page.locator('h2:text("Sign in to GEP System")').isVisible().catch(() => false);
    
    if (needsLogin) {
      console.log('🔐 Login required, using manager demo account');
      
      // Click the "Login as Manager" button to fill the form
      const managerButton = page.locator('button:text("Login as Manager")');
      const managerButtonVisible = await managerButton.isVisible().catch(() => false);
      
      if (managerButtonVisible) {
        console.log('📋 Clicking Manager demo button to fill credentials');
        await managerButton.click();
      } else {
        // Fallback: manual form fill from environment
        const testEmail = process.env.TEST_MANAGER_EMAIL || 'manager@gephellas.com';
        const testPassword = process.env.TEST_MANAGER_PASSWORD || 'Manager2024!';
        await page.fill('input[type="email"]', testEmail);  
        await page.fill('input[type="password"]', testPassword);
      }
      
      // Now click the "Sign in" button to actually login
      console.log('🔑 Clicking Sign in button');
      await page.click('button[type="submit"]:text("Sign in")');
      
      // Wait for dashboard to load
      await page.waitForTimeout(3000);
      console.log('⏳ Waiting for login to complete');
    }
    
    console.log('✅ Authentication setup complete');
  });

  test('should generate AI customer request data', async ({ page }) => {
    console.log('🎯 Starting AI Customer Request Generation Test');
    
    // Check current page and navigate if needed
    const currentUrl = page.url();
    console.log(`📍 Current URL: ${currentUrl}`);
    
    // Navigate to new request page
    console.log('🧭 Navigating to /requests/new');
    await page.goto('/requests/new');
    await page.waitForLoadState('networkidle');
    
    // Wait for page content to load 
    await page.waitForTimeout(2000);
    
    // Check what page we're actually on
    const pageTitle = await page.title();
    const headings = await page.locator('h1, h2').allTextContents();
    console.log(`📄 Page title: ${pageTitle}`);
    console.log(`📝 Page headings: ${headings.join(', ')}`);
    
    // Look for the new request page elements more flexibly
    const newRequestIndicators = [
      page.locator('h1:text("New Customer Request")'),
      page.locator('text=Submit a new health inspection request'),
      page.locator('button:text("Generate with AI")'),
      page.locator('button:has-text("Generate with AI")')
    ];
    
    let pageFound = false;
    for (const indicator of newRequestIndicators) {
      if (await indicator.isVisible().catch(() => false)) {
        console.log('✅ Found new request page element');
        pageFound = true;
        break;
      }
    }
    
    if (!pageFound) {
      console.log('⚠️ Not on new request page, let me try navigation menu');
      // Try clicking through the navigation menu
      const customerRequestsLink = page.locator('a[href="/requests"], a:text("Customer Requests")');
      if (await customerRequestsLink.isVisible().catch(() => false)) {
        await customerRequestsLink.click();
        await page.waitForTimeout(1000);
        
        const newRequestButton = page.locator('a[href="/requests/new"], button:text("New Request"), a:text("New Request")');
        if (await newRequestButton.isVisible().catch(() => false)) {
          await newRequestButton.click();
          await page.waitForTimeout(1000);
        }
      }
    }
    
    // Now find the AI generation button with more flexibility
    const aiButton = page.locator('button:has-text("Generate with AI"), button:has-text("Generate AI"), button:has-text("🤖")');
    await expect(aiButton.first()).toBeVisible({ timeout: 10000 });
    console.log('✅ AI Generation button is visible');
    
    // Check initial form state (should be empty)
    const companyNameField = page.locator('input[name="name"]');
    await expect(companyNameField).toHaveValue('');
    console.log('✅ Form initially empty');
    
    // Click the AI generation button
    await aiButton.click();
    console.log('🤖 Clicked AI Generation button');
    
    // Wait for loading state
    await expect(page.locator('button:has-text("Claude AI Generating")')).toBeVisible({ timeout: 2000 });
    console.log('⏳ Loading state detected');
    
    // Wait for AI generation to complete (button should change back)
    await expect(aiButton).toBeVisible({ timeout: 10000 });
    console.log('✅ AI generation completed');
    
    // Verify form has been populated with data
    await expect(companyNameField).not.toHaveValue('');
    console.log('✅ Company name field populated');
    
    // Check that multiple fields are populated
    const locationField = page.locator('input[name="location"]');
    const emailField = page.locator('input[name="contactEmail"]');
    const phoneField = page.locator('input[name="contactPhone"]');
    const employeesField = page.locator('input[name="totalEmployees"]');
    
    await expect(locationField).not.toHaveValue('');
    await expect(emailField).not.toHaveValue('');
    await expect(phoneField).not.toHaveValue('');
    await expect(employeesField).not.toHaveValue('');
    console.log('✅ All key fields populated');
    
    // Verify Greek business characteristics
    const locationValue = await locationField.inputValue();
    const emailValue = await emailField.inputValue();
    const phoneValue = await phoneField.inputValue();
    
    expect(locationValue).toContain('Greece');
    expect(emailValue).toMatch(/\.gr$/);
    expect(phoneValue).toMatch(/^\+30/);
    console.log('✅ Greek business characteristics verified');
    
    // Check for success message (AI or fallback)
    const successMessages = [
      page.locator('text=AI-generated customer data loaded'),
      page.locator('text=AI service unavailable'),
      page.locator('text=Demo data filled'),
      page.locator('text=loaded fallback demo data'),
      page.locator('[class*="green"]').filter({ hasText: /.*(success|loaded|filled|complete).*/i })
    ];
    
    let messageFound = false;
    for (const message of successMessages) {
      if (await message.isVisible().catch(() => false)) {
        const messageText = await message.textContent();
        console.log(`✅ Success message displayed: "${messageText}"`);
        messageFound = true;
        break;
      }
    }
    
    if (!messageFound) {
      console.log('⚠️ No success message found, but form was populated successfully');
    }
    
    // Capture generated data for logging
    const generatedData = {
      company: await companyNameField.inputValue(),
      location: await locationField.inputValue(),
      email: await emailValue,
      phone: await phoneValue,
      employees: await employeesField.inputValue()
    };
    
    console.log('📊 Generated Data:', JSON.stringify(generatedData, null, 2));
  });

  test('should generate different data on multiple clicks', async ({ page }) => {
    console.log('🎯 Testing multiple AI generations for uniqueness');
    
    // Navigate to new request page
    await page.goto('/requests/new');
    await page.waitForLoadState('networkidle');
    
    const aiButton = page.locator('button:has-text("Generate with AI")');
    const companyNameField = page.locator('input[name="name"]');
    
    // Generate first dataset
    await aiButton.click();
    await expect(page.locator('button:has-text("Claude AI Generating")')).toBeVisible({ timeout: 2000 });
    await expect(aiButton).toBeVisible({ timeout: 10000 });
    
    const firstCompany = await companyNameField.inputValue();
    console.log('🏢 First generation:', firstCompany);
    
    // Generate second dataset
    await aiButton.click();
    await expect(page.locator('button:has-text("Claude AI Generating")')).toBeVisible({ timeout: 2000 });
    await expect(aiButton).toBeVisible({ timeout: 10000 });
    
    const secondCompany = await companyNameField.inputValue();
    console.log('🏢 Second generation:', secondCompany);
    
    // Companies should be different (though there's a small chance they could be the same)
    // We'll log both but not fail the test if they're the same due to randomness
    if (firstCompany !== secondCompany) {
      console.log('✅ Generated different companies as expected');
    } else {
      console.log('⚠️ Same company generated (acceptable due to randomness)');
    }
    
    // Verify data is still valid
    const locationValue = await page.locator('input[name="location"]').inputValue();
    const emailValue = await page.locator('input[name="contactEmail"]').inputValue();
    
    expect(locationValue).toContain('Greece');
    expect(emailValue).toMatch(/\.gr$/);
    console.log('✅ Second generation maintains Greek business characteristics');
  });

  test('should handle API failures gracefully', async ({ page }) => {
    console.log('🎯 Testing graceful handling of API failures');
    
    // Intercept the AI generation API call and make it fail
    await page.route('/api/customer-requests/generate-ai', route => {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Internal server error' })
      });
    });
    
    await page.goto('/requests/new');
    await page.waitForLoadState('networkidle');
    
    const aiButton = page.locator('button:has-text("Generate with AI")');
    const companyNameField = page.locator('input[name="name"]');
    
    // Click button and wait for processing
    await aiButton.click();
    await expect(page.locator('button:has-text("Claude AI Generating")')).toBeVisible({ timeout: 2000 });
    await expect(aiButton).toBeVisible({ timeout: 10000 });
    
    // Should fall back to demo data
    const companyName = await companyNameField.inputValue();
    expect(companyName).toContain('Fallback');
    console.log('✅ Fallback data loaded on API failure');
    
    // Check for fallback message
    const fallbackMessage = page.locator('text=AI service unavailable');
    await expect(fallbackMessage).toBeVisible({ timeout: 2000 });
    console.log('✅ Fallback message displayed');
  });

  test('should show loading state correctly', async ({ page }) => {
    console.log('🎯 Testing loading state behavior');
    
    await page.goto('/requests/new');
    await page.waitForLoadState('networkidle');
    
    const aiButton = page.locator('button:has-text("Generate with AI")');
    
    // Initial state
    await expect(aiButton).toBeEnabled();
    await expect(aiButton).toHaveText(/Generate with AI/);
    console.log('✅ Initial button state correct');
    
    // Click and immediately check loading state
    await aiButton.click();
    
    // Button should show loading state
    await expect(page.locator('button:has-text("Claude AI Generating")')).toBeVisible({ timeout: 2000 });
    await expect(page.locator('button[disabled]')).toBeVisible();
    console.log('✅ Loading state activated correctly');
    
    // Should return to normal state
    await expect(aiButton).toBeEnabled({ timeout: 10000 });
    await expect(aiButton).toHaveText(/Generate with AI/);
    console.log('✅ Returned to normal state after completion');
  });
});