import { test as base } from '@playwright/test';

interface TestFixtures {
  // Custom fixtures can be added here
}

export const test = base.extend<TestFixtures>({});

export { expect } from '@playwright/test';
