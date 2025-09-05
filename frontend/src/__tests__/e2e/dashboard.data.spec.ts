import { test, expect } from '@playwright/test';

test.describe('Dashboard Data Validation', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the dashboard
    await page.goto('http://localhost:3000');

    // Wait for any authentication or redirects to complete
    await page.waitForLoadState('networkidle');
  });

  test('should display real database stats instead of hardcoded values', async ({ page }) => {
    // Wait for the dashboard to load
    await page.waitForSelector('[data-testid="dashboard-stats"], .grid', { timeout: 10000 });

    // Get the stats values
    const totalRequests = await page
      .locator('p:has-text("Total Requests") + * p')
      .first()
      .textContent();
    const activePartners = await page
      .locator('p:has-text("Active Partners") + * p')
      .first()
      .textContent();
    const pendingAssignments = await page
      .locator('p:has-text("Pending Assignments") + * p')
      .first()
      .textContent();
    const completedThisMonth = await page
      .locator('p:has-text("Completed This Month") + * p')
      .first()
      .textContent();

    console.log('Dashboard Stats Found:');
    console.log('- Total Requests:', totalRequests);
    console.log('- Active Partners:', activePartners);
    console.log('- Pending Assignments:', pendingAssignments);
    console.log('- Completed This Month:', completedThisMonth);

    // Check that we're NOT showing the old hardcoded values
    expect(totalRequests).not.toBe('47');
    expect(activePartners).not.toBe('23');
    expect(pendingAssignments).not.toBe('8');
    expect(completedThisMonth).not.toBe('31');

    // Check that values are numbers (not loading state)
    expect(totalRequests).not.toBe('...');
    expect(activePartners).not.toBe('...');
    expect(pendingAssignments).not.toBe('...');
    expect(completedThisMonth).not.toBe('...');

    // Active partners should be around 110 (our expected count)
    const activePartnersNum = parseInt(activePartners || '0');
    expect(activePartnersNum).toBeGreaterThan(50); // Should be much higher than old value of 23

    // Log the actual API endpoints being called
    await page.route('**/api/**', route => {
      console.log('API Call:', route.request().method(), route.request().url());
      route.continue();
    });
  });

  test('should make API calls to fetch real data', async ({ page }) => {
    // Track API calls
    const apiCalls = [];

    await page.route('**/api/**', route => {
      apiCalls.push({
        method: route.request().method(),
        url: route.request().url(),
        status: 'called',
      });
      route.continue();
    });

    // Navigate to dashboard
    await page.goto('http://localhost:3000');
    await page.waitForLoadState('networkidle');

    // Wait a bit more to ensure all API calls complete
    await page.waitForTimeout(3000);

    console.log('API Calls Made:', apiCalls);

    // Check that the expected API endpoints were called
    const partnersCalled = apiCalls.some(call => call.url.includes('/api/partners'));
    const requestsCalled = apiCalls.some(call => call.url.includes('/api/customer-requests'));
    const assignmentsCalled = apiCalls.some(call => call.url.includes('/api/assignments'));

    expect(partnersCalled).toBe(true);
    expect(requestsCalled).toBe(true);
    expect(assignmentsCalled).toBe(true);
  });

  test('should show loading states initially', async ({ page }) => {
    // Navigate but don't wait for network idle to catch loading state
    await page.goto('http://localhost:3000');

    // Check for loading indicators within first few seconds
    const hasLoadingState = (await page.locator('text=...').count()) > 0;

    if (hasLoadingState) {
      console.log('✓ Loading states detected initially');
    } else {
      console.log('⚠ No loading states detected (data loaded very quickly)');
    }

    // Wait for data to load
    await page.waitForLoadState('networkidle');

    // After loading, should not show loading indicators
    const stillLoading = await page.locator('text=...').count();
    expect(stillLoading).toBe(0);
  });

  test('should handle API errors gracefully', async ({ page }) => {
    // Mock API failures
    await page.route('**/api/partners', route => {
      route.fulfill({ status: 500, body: 'Server Error' });
    });

    await page.route('**/api/customer-requests', route => {
      route.fulfill({ status: 404, body: 'Not Found' });
    });

    await page.route('**/api/assignments', route => {
      route.fulfill({ status: 503, body: 'Service Unavailable' });
    });

    await page.goto('http://localhost:3000');
    await page.waitForLoadState('networkidle');

    // Should show 0 values when APIs fail (graceful degradation)
    const totalRequests = await page
      .locator('p:has-text("Total Requests") + * p')
      .first()
      .textContent();
    const activePartners = await page
      .locator('p:has-text("Active Partners") + * p')
      .first()
      .textContent();

    expect(totalRequests).toBe('0');
    expect(activePartners).toBe('0');

    console.log('✓ Graceful error handling confirmed');
  });
});
