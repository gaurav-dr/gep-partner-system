import { FullConfig } from '@playwright/test';

async function globalTeardown(config: FullConfig) {
  console.log('🧹 Cleaning up E2E test environment...');
  
  // Perform any cleanup needed after all tests
  // This could include clearing test data, stopping services, etc.
  
  console.log('✅ E2E test environment cleaned up');
}

export default globalTeardown;