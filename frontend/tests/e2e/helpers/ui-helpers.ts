import { Page, Locator } from '@playwright/test';

/**
 * UI Helper Functions
 *
 * Provides abstractions for common UI interactions:
 * - Form filling and submission
 * - Table waiting and interaction
 * - Drawer/modal management
 * - Dropdown selection
 * - File uploads
 * - Navigation and assertions
 */

/**
 * Fill a form with multiple fields by label text
 *
 * Supports:
 * - Text inputs
 * - Text areas
 * - Selects/dropdowns
 * - Checkboxes (with boolean value)
 * - Radio buttons
 */
export async function fillForm(
  page: Page,
  fields: Record<string, string | boolean>
): Promise<void> {
  for (const [label, value] of Object.entries(fields)) {
    const labelLocator = page.locator(`label:has-text("${label}")`);
    const labelExists = await labelLocator.count().then(c => c > 0);

    if (!labelExists) {
      throw new Error(`Label not found: "${label}"`);
    }

    // Get associated input
    const inputLocator = labelLocator.locator('~ input, ~ textarea, ~ select');

    if (typeof value === 'boolean') {
      // Handle checkbox
      const checkbox = inputLocator.first();
      const isChecked = await checkbox.isChecked();
      if (isChecked !== value) {
        await checkbox.click();
      }
    } else {
      // Handle text inputs and selects
      const input = inputLocator.first();
      const tagName = await input.evaluate(el => el.tagName);

      if (tagName === 'SELECT') {
        await input.selectOption(value);
      } else {
        await input.fill(value);
      }
    }
  }
}

/**
 * Submit a form and wait for navigation or success indicator
 */
export async function submitForm(
  page: Page,
  options: { waitForUrl?: string; waitForText?: string } = {}
): Promise<void> {
  const button = page.locator('button[type="submit"]');

  if ((await button.count()) === 0) {
    throw new Error('Submit button not found');
  }

  await button.click();

  if (options.waitForUrl) {
    await page.waitForURL(options.waitForUrl);
  }

  if (options.waitForText) {
    await page.waitForSelector(`text=${options.waitForText}`);
  }

  // Wait for network requests to complete
  await page.waitForLoadState('networkidle').catch(() => {
    // Network idle might not occur, continue anyway
  });
}

/**
 * Wait for a table to be loaded with at least one row
 */
export async function waitForTable(page: Page, options: { minRows?: number } = {}): Promise<void> {
  const minRows = options.minRows || 1;

  // Wait for table rows
  const rows = page.locator('tbody tr, .ant-table-row');
  await rows.first().waitFor({ state: 'visible', timeout: 30000 });

  // Verify minimum row count
  await page.waitForFunction(
    (min) => {
      const rowCount = document.querySelectorAll('tbody tr, .ant-table-row').length;
      return rowCount >= min;
    },
    minRows,
    { timeout: 30000 }
  );
}

/**
 * Get table data as array of objects
 */
export async function getTableData(page: Page): Promise<Array<Record<string, string>>> {
  return page.evaluate(() => {
    const rows = document.querySelectorAll('tbody tr, .ant-table-row');
    const headers = document.querySelectorAll('thead th, .ant-table-thead th');

    return Array.from(rows).map(row => {
      const cells = row.querySelectorAll('td');
      const data: Record<string, string> = {};

      headers.forEach((header, index) => {
        const headerText = header.textContent?.trim() || '';
        const cellText = cells[index]?.textContent?.trim() || '';
        if (headerText) {
          data[headerText] = cellText;
        }
      });

      return data;
    });
  });
}

/**
 * Open an action drawer/modal (e.g., create, edit)
 */
export async function openDrawer(
  page: Page,
  action: 'create' | 'edit' | string
): Promise<void> {
  let button: Locator;

  if (action === 'create') {
    button = page.locator('button:has-text("Add"), button:has-text("Create"), button:has-text("New")');
  } else if (action === 'edit') {
    button = page.locator('button:has-text("Edit"), .ant-table-row button:has-text("Edit")');
  } else {
    button = page.locator(`button:has-text("${action}")`);
  }

  if ((await button.count()) === 0) {
    throw new Error(`Action button not found: "${action}"`);
  }

  await button.first().click();

  // Wait for drawer/modal to be visible
  await page.waitForSelector('.ant-drawer, .ant-modal, [role="dialog"]', { timeout: 10000 });
}

/**
 * Close drawer/modal
 */
export async function closeDrawer(page: Page): Promise<void> {
  const closeButton = page.locator('.ant-drawer-close, .ant-modal-close');
  if ((await closeButton.count()) > 0) {
    await closeButton.first().click();
  }

  // Wait for drawer to close
  await page.waitForSelector('.ant-drawer, .ant-modal', { state: 'hidden' }).catch(() => {
    // Drawer might already be closed
  });
}

/**
 * Select an option from a dropdown by label
 */
export async function selectDropdown(
  page: Page,
  fieldLabel: string,
  optionText: string
): Promise<void> {
  const labelLocator = page.locator(`label:has-text("${fieldLabel}")`);
  const labelExists = await labelLocator.count().then(c => c > 0);

  if (!labelExists) {
    throw new Error(`Label not found: "${fieldLabel}"`);
  }

  // Click to open dropdown
  const selectInput = labelLocator.locator('~ .ant-select, ~ select').first();
  await selectInput.click();

  // Wait for dropdown menu
  await page.waitForSelector('.ant-select-dropdown', { timeout: 10000 });

  // Click option
  const option = page.locator(`.ant-select-item:has-text("${optionText}")`);
  if ((await option.count()) === 0) {
    throw new Error(`Option not found: "${optionText}"`);
  }

  await option.first().click();
}

/**
 * Upload a file to an input
 */
export async function uploadFile(
  page: Page,
  inputSelector: string,
  filePath: string
): Promise<void> {
  const input = page.locator(inputSelector);

  if ((await input.count()) === 0) {
    throw new Error(`File input not found: "${inputSelector}"`);
  }

  await input.setInputFiles(filePath);
}

/**
 * Wait for and verify success message
 */
export async function expectSuccessMessage(
  page: Page,
  options: { text?: string; timeout?: number } = {}
): Promise<void> {
  const timeout = options.timeout || 30000;
  const text = options.text || 'success';

  await page.waitForSelector(
    `.ant-message-success, .ant-notification-success, [role="alert"]:has-text("${text}")`,
    { timeout }
  );
}

/**
 * Wait for and verify error message
 */
export async function expectErrorMessage(
  page: Page,
  options: { text?: string; timeout?: number } = {}
): Promise<void> {
  const timeout = options.timeout || 30000;
  const text = options.text || 'error';

  await page.waitForSelector(
    `.ant-message-error, .ant-notification-error, [role="alert"]:has-text("${text}")`,
    { timeout }
  );
}

/**
 * Click table action button for a specific row
 */
export async function clickTableAction(
  page: Page,
  rowIdentifier: string,
  action: string
): Promise<void> {
  // Find row containing identifier
  const row = page.locator(`tbody tr:has-text("${rowIdentifier}")`);

  if ((await row.count()) === 0) {
    throw new Error(`Row not found with identifier: "${rowIdentifier}"`);
  }

  // Click action button in that row
  const actionButton = row.locator(`button:has-text("${action}")`);

  if ((await actionButton.count()) === 0) {
    throw new Error(`Action "${action}" not found in row`);
  }

  await actionButton.first().click();
}

/**
 * Navigate to a menu item by path (e.g., "Settings > General")
 */
export async function navigateToMenuItem(page: Page, path: string): Promise<void> {
  const parts = path.split('>').map(p => p.trim());

  for (const part of parts) {
    const menuItem = page.locator(`a, button, [role="menuitem"]:has-text("${part}")`);

    if ((await menuItem.count()) === 0) {
      throw new Error(`Menu item not found: "${part}"`);
    }

    await menuItem.first().click();
    await page.waitForLoadState('networkidle').catch(() => {
      // Network idle might not occur, continue anyway
    });
  }
}

/**
 * Get current URL path
 */
export function getCurrentPath(page: Page): string {
  return new URL(page.url()).pathname;
}

/**
 * Check if user is logged in
 */
export async function isLoggedIn(page: Page): Promise<boolean> {
  // Check for dashboard or profile menu
  const dashboardExists = await page.locator('[href*="dashboard"]').count().then(c => c > 0);
  const profileExists = await page.locator('[class*="profile"], [title="Profile"]').count().then(c => c > 0);

  return dashboardExists || profileExists;
}
