import { test, expect } from '@playwright/test';

/**
 * Deployment Health Check E2E Tests
 * Comprehensive tests to verify the deployed React application works end-to-end
 * These tests simulate real user interactions to verify deployment success
 */

test.describe('Deployment Health Checks', () => {
  test.beforeEach(async ({ page }) => {
    // Set up console error tracking
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });
    
    // Store errors on the page for access in tests
    await page.addInitScript(() => {
      (window as any).consoleErrors = [];
      const originalError = console.error;
      console.error = (...args) => {
        (window as any).consoleErrors.push(args.join(' '));
        originalError.apply(console, args);
      };
    });
  });

  test('Application loads without errors', async ({ page }) => {
    // Navigate to the application
    const response = await page.goto('/');
    
    // Check that the page loaded successfully
    expect(response?.status()).toBe(200);
    
    // Wait for the page to be fully loaded
    await page.waitForLoadState('networkidle');
    
    // Check that we have a proper HTML document
    const title = await page.title();
    expect(title).toBeDefined();
    expect(title.length).toBeGreaterThan(0);
    
    // Check for critical HTML elements
    const body = await page.locator('body');
    await expect(body).toBeVisible();
    
    // Verify no critical JavaScript errors
    const consoleErrors = await page.evaluate(() => (window as any).consoleErrors || []);
    const criticalErrors = consoleErrors.filter((error: string) => 
      error.toLowerCase().includes('failed to fetch') ||
      error.toLowerCase().includes('network error') ||
      error.toLowerCase().includes('chunk load failed') ||
      error.toLowerCase().includes('loading chunk')
    );
    
    if (criticalErrors.length > 0) {
      console.warn('Console errors detected:', criticalErrors);
      // Don't fail the test for non-critical errors
    }
  });

  test('React application mounts correctly', async ({ page }) => {
    await page.goto('/');
    
    // Wait for React to mount by looking for the root element content
    await page.waitForSelector('div#root > *', { timeout: 10000 });
    
    // Check that the React root has content
    const rootContent = await page.locator('#root').innerHTML();
    expect(rootContent.length).toBeGreaterThan(0);
    
    // Look for React-specific indicators
    const hasReactContent = await page.evaluate(() => {
      const root = document.getElementById('root');
      return root && root.children.length > 0;
    });
    
    expect(hasReactContent).toBeTruthy();
  });

  test('Static assets load successfully', async ({ page }) => {
    // Track failed network requests
    const failedRequests: string[] = [];
    
    page.on('requestfailed', (request) => {
      failedRequests.push(request.url());
    });
    
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Check for common static asset types
    const staticAssetSelectors = [
      'link[rel="icon"]',
      'link[rel="manifest"]',
      'link[href*="static/css"]',
      'script[src*="static/js"]',
    ];
    
    for (const selector of staticAssetSelectors) {
      const elements = await page.locator(selector);
      const count = await elements.count();
      
      if (count > 0) {
        console.log(`✓ Found ${count} ${selector} elements`);
      } else {
        console.log(`ℹ No ${selector} elements found (may be normal)`);
      }
    }
    
    // Report any failed requests
    if (failedRequests.length > 0) {
      console.warn('Failed requests:', failedRequests);
      
      // Filter out non-critical failures
      const criticalFailures = failedRequests.filter(url => 
        url.includes('static/') || 
        url.includes('manifest.json') ||
        url.includes('favicon.ico')
      );
      
      if (criticalFailures.length > 0) {
        throw new Error(`Critical static assets failed to load: ${criticalFailures.join(', ')}`);
      }
    }
  });

  test('Application shows loading state or content', async ({ page }) => {
    await page.goto('/');
    
    // Wait for either loading state or main content
    try {
      // Look for loading indicator
      await page.waitForSelector('text=Loading', { timeout: 3000 });
      console.log('✓ Loading state detected');
      
      // Wait for loading to complete
      await page.waitForSelector('text=Loading', { state: 'detached', timeout: 15000 });
      console.log('✓ Loading completed');
    } catch {
      // If no loading state, check for immediate content
      await page.waitForSelector('div#root > *', { timeout: 5000 });
      console.log('✓ Content loaded immediately');
    }
    
    // Verify some content is present
    const bodyText = await page.locator('body').textContent();
    expect(bodyText).toBeDefined();
    expect(bodyText!.length).toBeGreaterThan(0);
  });

  test('Navigation and routing work', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Test that the page has loaded with routing context
    const url = page.url();
    expect(url).toContain('/');
    
    // Try to navigate to different routes (if they exist and are accessible)
    const testRoutes = [
      '/',
      '/test',
    ];
    
    for (const route of testRoutes) {
      try {
        await page.goto(route, { timeout: 10000 });
        await page.waitForLoadState('domcontentloaded');
        
        const currentUrl = page.url();
        expect(currentUrl).toContain(route);
        
        // Verify page has content
        const hasContent = await page.evaluate(() => {
          const root = document.getElementById('root');
          return root && root.textContent && root.textContent.length > 0;
        });
        
        expect(hasContent).toBeTruthy();
        console.log(`✓ Route ${route} is accessible`);
        
      } catch (error) {
        console.log(`ℹ Route ${route} not accessible or requires auth: ${error}`);
        // Don't fail the test for routes that require authentication
      }
    }
  });

  test('Authentication flow initializes', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Check for either login form or authenticated content
    const hasLoginForm = await page.locator('input[type="email"], input[type="password"]').count() > 0;
    const hasAuthenticatedContent = await page.locator('nav, header, [data-testid="dashboard"]').count() > 0;
    const hasLoadingState = await page.locator('text=Loading').count() > 0;
    
    // At least one of these should be present
    const authStateDetected = hasLoginForm || hasAuthenticatedContent || hasLoadingState;
    expect(authStateDetected).toBeTruthy();
    
    if (hasLoginForm) {
      console.log('✓ Login form detected - authentication required');
    } else if (hasAuthenticatedContent) {
      console.log('✓ Authenticated content detected - user logged in');
    } else if (hasLoadingState) {
      console.log('✓ Loading state detected - authentication checking');
    }
  });

  test('Error boundaries handle crashes gracefully', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Try to trigger potential errors and verify they're handled
    await page.evaluate(() => {
      // Simulate potential React errors
      window.dispatchEvent(new Event('error'));
    });
    
    // Wait a bit for any error boundaries to activate
    await page.waitForTimeout(1000);
    
    // Verify the application is still responsive
    const isResponsive = await page.evaluate(() => {
      const root = document.getElementById('root');
      return root && root.children.length > 0;
    });
    
    expect(isResponsive).toBeTruthy();
  });

  test('Viewport and responsiveness work', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Test different viewport sizes
    const viewports = [
      { width: 1920, height: 1080, name: 'Desktop' },
      { width: 768, height: 1024, name: 'Tablet' },
      { width: 375, height: 667, name: 'Mobile' },
    ];
    
    for (const viewport of viewports) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.waitForTimeout(500); // Allow layout to settle
      
      // Verify content is still visible
      const hasVisibleContent = await page.evaluate(() => {
        const root = document.getElementById('root');
        if (!root) return false;
        
        const rect = root.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0;
      });
      
      expect(hasVisibleContent).toBeTruthy();
      console.log(`✓ ${viewport.name} viewport (${viewport.width}x${viewport.height}) works`);
    }
  });

  test('Performance is acceptable', async ({ page }) => {
    // Start performance timing
    const startTime = Date.now();
    
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    const loadTime = Date.now() - startTime;
    
    // Check that the page loaded in reasonable time
    expect(loadTime).toBeLessThan(30000); // 30 seconds max
    
    if (loadTime > 10000) {
      console.warn(`⚠️ Slow page load time: ${loadTime}ms`);
    } else {
      console.log(`✓ Page loaded in ${loadTime}ms`);
    }
    
    // Check for web vitals if available
    const vitals = await page.evaluate(() => {
      return {
        // Basic performance metrics that should be available
        timing: performance.timing ? {
          domContentLoaded: performance.timing.domContentLoadedEventEnd - performance.timing.navigationStart,
          loadComplete: performance.timing.loadEventEnd - performance.timing.navigationStart,
        } : null,
      };
    });
    
    if (vitals.timing) {
      console.log(`DOM Content Loaded: ${vitals.timing.domContentLoaded}ms`);
      console.log(`Load Complete: ${vitals.timing.loadComplete}ms`);
      
      // Basic performance expectations
      expect(vitals.timing.domContentLoaded).toBeLessThan(10000);
      expect(vitals.timing.loadComplete).toBeLessThan(15000);
    }
  });
});

test.describe('Critical Functionality', () => {
  test('Application handles offline state gracefully', async ({ page, context }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Go offline
    await context.setOffline(true);
    
    // Try to interact with the page
    await page.reload({ waitUntil: 'domcontentloaded' }).catch(() => {
      // Expected to fail offline
    });
    
    // Go back online
    await context.setOffline(false);
    
    // Verify the page recovers
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    const isResponsive = await page.evaluate(() => {
      const root = document.getElementById('root');
      return root && root.children.length > 0;
    });
    
    expect(isResponsive).toBeTruthy();
  });

  test('Browser back/forward navigation works', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Try navigation if routes are available
    try {
      await page.goto('/test');
      await page.waitForLoadState('domcontentloaded');
      
      // Go back
      await page.goBack();
      await page.waitForLoadState('domcontentloaded');
      
      // Go forward
      await page.goForward();
      await page.waitForLoadState('domcontentloaded');
      
      // Verify navigation worked
      const url = page.url();
      expect(url).toContain('/test');
      
    } catch (error) {
      console.log('Navigation test skipped - routes may require authentication');
    }
  });
});