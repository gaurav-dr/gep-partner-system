const { test, expect } = require('@playwright/test');

test.describe('Simple AI Button Test', () => {
  test('should find AI button on new request page (skip auth)', async ({ page }) => {
    console.log('🎯 Testing direct navigation to new request page');
    
    // Try direct navigation first
    await page.goto('/requests/new');
    await page.waitForTimeout(2000);
    
    console.log(`📍 Current URL: ${page.url()}`);
    const pageTitle = await page.title();
    console.log(`📄 Page title: ${pageTitle}`);
    
    // Get all text content to see what's actually on the page
    const bodyText = await page.locator('body').textContent();
    console.log(`📝 Page contains "Generate" text: ${bodyText.includes('Generate')}`);
    console.log(`📝 Page contains "AI" text: ${bodyText.includes('AI')}`);
    console.log(`📝 Page contains "New Customer Request": ${bodyText.includes('New Customer Request')}`);
    
    // Look for any buttons
    const allButtons = await page.locator('button').allTextContents();
    console.log(`🔘 All buttons found: ${JSON.stringify(allButtons)}`);
    
    // Look for the specific AI button
    const aiButtons = [
      page.locator('button:has-text("Generate with AI")'),
      page.locator('button:has-text("🤖")'),
      page.locator('button:text("🤖 Generate with AI")'),
      page.locator('[role="button"]:has-text("Generate")'),
      page.locator('button').filter({ hasText: 'AI' })
    ];
    
    for (let i = 0; i < aiButtons.length; i++) {
      const button = aiButtons[i];
      const isVisible = await button.isVisible().catch(() => false);
      console.log(`🔍 Button ${i + 1} visible: ${isVisible}`);
      if (isVisible) {
        const text = await button.textContent();
        console.log(`✅ Found AI button with text: "${text}"`);
        return; // Test passed
      }
    }
    
    // If we get here, no AI button was found
    console.log('❌ No AI button found on the page');
    
    // Take a screenshot for debugging
    await page.screenshot({ path: 'debug-page.png', fullPage: true });
    console.log('📸 Screenshot saved as debug-page.png');
    
    // Fail the test if we didn't find the button
    throw new Error('AI button not found on page');
  });
});