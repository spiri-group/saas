import { Page, expect } from '@playwright/test';

/**
 * Utility functions for Playwright tests
 */

/**
 * Wait for a GraphQL request to complete
 */
export async function waitForGraphQL(page: Page, operationName: string, timeout = 10000) {
  return page.waitForResponse(
    (response) => {
      if (!response.url().includes('graphql')) return false;
      return response.request().postDataJSON()?.operationName === operationName;
    },
    { timeout }
  );
}

/**
 * Mock a GraphQL response
 */
export async function mockGraphQLResponse(
  page: Page,
  operationName: string,
  mockData: any
) {
  await page.route('**/graphql', async (route) => {
    const request = route.request();
    const postData = request.postDataJSON();

    if (postData?.operationName === operationName) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: mockData }),
      });
    } else {
      await route.continue();
    }
  });
}

/**
 * Fill a form field and wait for it to be updated
 */
export async function fillFormField(page: Page, selector: string, value: string) {
  await page.fill(selector, value);
  await page.waitForTimeout(100); // Small delay for React to process
  const actualValue = await page.inputValue(selector);
  expect(actualValue).toBe(value);
}

/**
 * Wait for loading state to complete
 */
export async function waitForLoadingToComplete(page: Page) {
  // Wait for common loading indicators to disappear
  await page.waitForSelector('[data-testid="loading"]', { state: 'hidden', timeout: 10000 }).catch(() => {});
  await page.waitForSelector('.loading', { state: 'hidden', timeout: 10000 }).catch(() => {});
  await page.waitForLoadState('networkidle');
}

/**
 * Take a screenshot with a descriptive name
 */
export async function takeScreenshot(page: Page, name: string) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  await page.screenshot({
    path: `test-results/screenshots/${name}-${timestamp}.png`,
    fullPage: true,
  });
}

/**
 * Wait for toast notification with specific message
 */
export async function waitForToast(page: Page, message: string, timeout = 5000) {
  const toast = page.locator('[data-sonner-toast]', { hasText: message });
  await expect(toast).toBeVisible({ timeout });
  return toast;
}

/**
 * Wait for success toast
 */
export async function waitForSuccessToast(page: Page, timeout = 5000) {
  const toast = page.locator('[data-sonner-toast][data-type="success"]');
  await expect(toast).toBeVisible({ timeout });
  return toast;
}

/**
 * Wait for error toast
 */
export async function waitForErrorToast(page: Page, timeout = 5000) {
  const toast = page.locator('[data-sonner-toast][data-type="error"]');
  await expect(toast).toBeVisible({ timeout });
  return toast;
}

/**
 * Generate random email for testing (Playwright test users - no emails sent)
 */
export function generateTestEmail(prefix = 'test') {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(7);
  return `${prefix}-${timestamp}-${random}@playwright.com`;
}

/**
 * Generate random phone number
 */
export function generateTestPhone() {
  const areaCode = Math.floor(Math.random() * 900) + 100;
  const prefix = Math.floor(Math.random() * 900) + 100;
  const lineNumber = Math.floor(Math.random() * 9000) + 1000;
  return `+1${areaCode}${prefix}${lineNumber}`;
}

/**
 * Wait for navigation and network to be idle
 */
export async function waitForNavigation(page: Page, url?: string | RegExp) {
  if (url) {
    await page.waitForURL(url);
  }
  await page.waitForLoadState('networkidle');
}

/**
 * Check if element is visible in viewport
 */
export async function isInViewport(page: Page, selector: string): Promise<boolean> {
  const element = page.locator(selector);
  const box = await element.boundingBox();
  if (!box) return false;

  const viewport = page.viewportSize();
  if (!viewport) return false;

  return (
    box.x >= 0 &&
    box.y >= 0 &&
    box.x + box.width <= viewport.width &&
    box.y + box.height <= viewport.height
  );
}

/**
 * Scroll element into view
 */
export async function scrollIntoView(page: Page, selector: string) {
  await page.locator(selector).scrollIntoViewIfNeeded();
  await page.waitForTimeout(300); // Wait for scroll animation
}

/**
 * Select option from Radix UI Select component
 */
export async function selectRadixOption(page: Page, triggerSelector: string, optionText: string) {
  // Click the select trigger
  await page.click(triggerSelector);

  // Wait for the dropdown to appear
  await page.waitForSelector('[role="listbox"]', { state: 'visible' });

  // Click the option
  await page.click(`[role="option"]:has-text("${optionText}")`);

  // Wait for dropdown to close
  await page.waitForSelector('[role="listbox"]', { state: 'hidden' });
}

/**
 * Open Radix UI Dialog
 */
export async function openDialog(page: Page, triggerSelector: string) {
  await page.click(triggerSelector);
  await page.waitForSelector('[role="dialog"]', { state: 'visible' });
}

/**
 * Close Radix UI Dialog
 */
export async function closeDialog(page: Page) {
  // Try to click the close button
  const closeButton = page.locator('[role="dialog"] button[aria-label="Close"]');
  if (await closeButton.count() > 0) {
    await closeButton.click();
  } else {
    // Fallback: press Escape
    await page.keyboard.press('Escape');
  }

  await page.waitForSelector('[role="dialog"]', { state: 'hidden' });
}

/**
 * Wait for table to load and return row count
 */
export async function getTableRowCount(page: Page, tableSelector: string): Promise<number> {
  await waitForLoadingToComplete(page);
  const rows = page.locator(`${tableSelector} tbody tr`);
  return await rows.count();
}

/**
 * Mock Stripe payment for testing
 */
export async function mockStripePayment(page: Page, success = true) {
  await page.route('**/api.stripe.com/**', async (route) => {
    if (success) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'pi_test_' + Math.random().toString(36).substring(7),
          status: 'succeeded',
        }),
      });
    } else {
      await route.fulfill({
        status: 402,
        contentType: 'application/json',
        body: JSON.stringify({
          error: {
            message: 'Your card was declined.',
          },
        }),
      });
    }
  });
}
