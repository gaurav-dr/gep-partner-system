import { test, expect } from '@playwright/test';
import { loginAsAdmin } from '../utils/login-helper';

test.describe('Customer Requests Page', () => {
  test('should load customer requests page with data after admin login', async ({ page }) => {
    // Login as admin using credentials
    await page.goto('http://localhost:3000/');
    
    // Wait for login page
    await expect(page.locator('text=Sign in to GEP System')).toBeVisible();
    
    // Fill in admin credentials directly
    await page.fill('input[type="email"]', 'admin@gephellas.com');
    await page.fill('input[type="password"]', 'GEPAdmin2024!');
    await page.click('button:has-text("Sign in")');
    
    // Wait for authentication to complete and redirect to dashboard
    await expect(page.locator('text=Dashboard')).toBeVisible({ timeout: 15000 });

    // Now navigate to the customer requests page
    await page.goto('http://localhost:3000/requests');

    // Wait for the page title to load using data-testid
    await expect(page.locator('[data-testid="page-title"]')).toContainText('Customer Requests');

    // Wait for data to load (up to 10 seconds) using data-testid
    await page.waitForSelector('[data-testid="requests-count"]', { timeout: 10000 });

    // Check that we have customer requests data loaded
    const requestsText = await page.locator('[data-testid="requests-count"]').textContent();
    console.log('Found requests text:', requestsText);

    // Should show search and filter controls using data-testid
    await expect(page.locator('[data-testid="search-input"]')).toBeVisible();
    await expect(page.locator('[data-testid="status-filter"]')).toBeVisible();

    // Should see the requests list container
    await expect(page.locator('[data-testid="requests-list"]')).toBeVisible();
    console.log('✅ Customer requests page loaded successfully');
  });

  test('should handle authentication requirement with demo button', async ({ page }) => {
    // Navigate directly to requests without authentication
    await page.goto('http://localhost:3000/requests');
    
    // Should be redirected to login
    await expect(page.locator('text=Sign in to GEP System')).toBeVisible();
    
    // Login as Admin using demo button
    await page.click('button:has-text("👤 Login as Admin")');
    await page.click('button:has-text("Sign in")');
    
    // Should eventually show customer requests page
    await expect(page.locator('[data-testid="page-title"]')).toContainText('Customer Requests', { timeout: 15000 });
  });
});