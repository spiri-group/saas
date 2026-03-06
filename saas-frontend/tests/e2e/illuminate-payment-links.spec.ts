import { test, expect, BrowserContext } from '@playwright/test';
import {
  setupIlluminatePractitioner,
  cleanupIlluminatePractitioner,
  practitionerCookiesPerWorker,
  practitionerSlugPerWorker,
  generateUniqueEmail,
  fillStripePaymentElement,
  createAuthenticatedContext,
} from '../utils/illuminate-setup';

/**
 * Payment Links E2E — Full lifecycle with real Stripe payment
 *
 * Run: yarn test:grep "Payment Links"
 */

test.beforeAll(async ({ browser }, testInfo) => {
  test.setTimeout(240000);
  await setupIlluminatePractitioner(browser, testInfo, 'illum-paylinks');
});

test.afterAll(async ({}, testInfo) => {
  test.setTimeout(120000);
  await cleanupIlluminatePractitioner(testInfo);
});

test.describe('Payment Links', () => {
  test('Payment Links — create, pay, verify status, filter, cancel, resend', async ({ browser }, testInfo) => {
    test.setTimeout(480000); // 8 minutes — real Stripe webhooks

    const slug = practitionerSlugPerWorker.get(testInfo.parallelIndex);
    const cookies = practitionerCookiesPerWorker.get(testInfo.parallelIndex);
    expect(slug).toBeDefined();
    expect(cookies).toBeDefined();

    const practitionerContext = await createAuthenticatedContext(browser, cookies!);
    const practitionerPage = await practitionerContext.newPage();

    let customerContext: BrowserContext | null = null;

    try {
      // ── Navigate to Payment Links ──
      await practitionerPage.goto(`/p/${slug}/manage/payment-links`);
      await expect(practitionerPage.locator('[data-testid="payment-links-view"]')).toBeVisible({ timeout: 15000 });
      console.log('[Payment Links] Page loaded');

      // Empty state initially
      const emptyOrList = practitionerPage.locator('[data-testid="payment-links-empty"]').or(
        practitionerPage.locator('[data-testid="payment-links-list"]')
      );
      await expect(emptyOrList).toBeVisible({ timeout: 10000 });

      // ── Create first payment link ──
      await practitionerPage.locator('[data-testid="create-payment-link-btn"]').click();
      await expect(practitionerPage.locator('[data-testid="create-payment-link-dialog"]')).toBeVisible({ timeout: 10000 });

      // Validation: submit empty → error toast
      await practitionerPage.locator('[data-testid="payment-link-submit"]').click();
      await expect(practitionerPage.locator('[data-sonner-toast][data-type="error"]').first()).toBeVisible({ timeout: 5000 });
      console.log('[Payment Links] Validation: empty email error');

      // Fill email, but leave amount at zero → error
      const customerEmail = generateUniqueEmail('pay-customer', testInfo);
      await practitionerPage.locator('[data-testid="payment-link-customer-email"]').fill(customerEmail);
      await practitionerPage.locator('[data-testid="payment-link-submit"]').click();
      await practitionerPage.waitForTimeout(500);
      await expect(practitionerPage.locator('[data-sonner-toast][data-type="error"]').first()).toBeVisible({ timeout: 5000 });
      console.log('[Payment Links] Validation: zero amount error');

      // Fill amount but empty description → error
      await practitionerPage.locator('[data-testid="payment-link-item-amount-0"]').fill('25');
      await practitionerPage.locator('[data-testid="payment-link-submit"]').click();
      await practitionerPage.waitForTimeout(500);
      await expect(practitionerPage.locator('[data-sonner-toast][data-type="error"]').first()).toBeVisible({ timeout: 5000 });
      console.log('[Payment Links] Validation: empty description error');

      // Fill complete form
      await practitionerPage.locator('[data-testid="payment-link-item-description-0"]').fill('Tarot Reading');
      await practitionerPage.locator('[data-testid="payment-link-expiration"]').click();
      await practitionerPage.locator('[role="option"]:has-text("7 days")').click();

      // Submit
      await practitionerPage.locator('[data-testid="payment-link-submit"]').click();
      await expect(practitionerPage.locator('[data-sonner-toast][data-type="success"]').first()).toBeVisible({ timeout: 15000 });
      console.log('[Payment Links] Payment link created');

      await expect(practitionerPage.locator('[data-testid="create-payment-link-dialog"]')).not.toBeVisible({ timeout: 5000 });

      // Link appears in list
      await expect(practitionerPage.locator('[data-testid="payment-links-list"]')).toBeVisible({ timeout: 10000 });
      const firstRow = practitionerPage.locator('[data-testid^="payment-link-row-"]').first();
      await expect(firstRow).toBeVisible({ timeout: 10000 });

      const rowTestId = await firstRow.getAttribute('data-testid');
      const linkId = rowTestId!.replace('payment-link-row-', '');
      console.log(`[Payment Links] Link ID: ${linkId}`);

      // Verify status, email, amount
      await expect(practitionerPage.locator(`[data-testid="payment-link-status-${linkId}"]`)).toContainText(/Sent/i);
      await expect(practitionerPage.locator(`[data-testid="payment-link-email-${linkId}"]`)).toContainText(customerEmail);
      await expect(practitionerPage.locator(`[data-testid="payment-link-amount-${linkId}"]`)).toContainText('25.00');

      // ── Customer pays via checkout page ──
      customerContext = await browser.newContext();
      const customerPage = await customerContext.newPage();

      await customerPage.goto(`/pay/${linkId}`);
      await expect(customerPage.locator('[data-testid="payment-link-checkout"]')).toBeVisible({ timeout: 15000 });
      console.log('[Payment Links] Customer checkout page loaded');

      await expect(customerPage.locator('[data-testid="checkout-total"]')).toContainText('$25.00');
      await expect(customerPage.locator('[data-testid="checkout-item-0"]')).toContainText('Tarot Reading');

      await fillStripePaymentElement(customerPage);

      await customerPage.locator('[data-testid="payment-submit-btn"]').click();
      console.log('[Payment Links] Payment submitted, waiting for redirect...');

      await expect(
        customerPage.locator('[data-testid="payment-link-success"]')
          .or(customerPage.locator('[data-testid="payment-link-paid"]'))
      ).toBeVisible({ timeout: 30000 });
      console.log('[Payment Links] Payment completed');

      // ── Poll for PAID status ──
      let isPaid = false;
      for (let attempt = 0; attempt < 20; attempt++) {
        if (attempt > 0) {
          await practitionerPage.waitForTimeout(3000);
        }
        await practitionerPage.goto(`/p/${slug}/manage/payment-links`);
        await expect(practitionerPage.locator('[data-testid="payment-links-view"]')).toBeVisible({ timeout: 10000 });

        const statusEl = practitionerPage.locator(`[data-testid="payment-link-status-${linkId}"]`);
        const statusText = await statusEl.textContent().catch(() => '');
        if (statusText && /Paid/i.test(statusText)) {
          isPaid = true;
          console.log(`[Payment Links] Marked PAID (attempt ${attempt + 1})`);
          break;
        }
        console.log(`[Payment Links] Waiting for webhook... status: ${statusText} (attempt ${attempt + 1}/20)`);
      }
      expect(isPaid).toBe(true);

      // Paid link should not have resend/cancel buttons
      await expect(practitionerPage.locator(`[data-testid="payment-link-resend-${linkId}"]`)).not.toBeVisible();
      await expect(practitionerPage.locator(`[data-testid="payment-link-cancel-${linkId}"]`)).not.toBeVisible();
      await expect(practitionerPage.locator(`[data-testid="payment-link-copy-${linkId}"]`)).toBeVisible();

      // ── Filter tests ──
      await practitionerPage.locator('[data-testid="payment-links-filter-paid"]').click();
      await practitionerPage.waitForTimeout(1000);
      await expect(practitionerPage.locator(`[data-testid="payment-link-row-${linkId}"]`)).toBeVisible();
      console.log('[Payment Links] Filter "Paid" shows the paid link');

      await practitionerPage.locator('[data-testid="payment-links-filter-sent"]').click();
      await practitionerPage.waitForTimeout(1000);
      await expect(practitionerPage.locator(`[data-testid="payment-link-row-${linkId}"]`)).not.toBeVisible();
      console.log('[Payment Links] Filter "Sent" hides the paid link');

      await practitionerPage.locator('[data-testid="payment-links-filter-all"]').click();
      await practitionerPage.waitForTimeout(1000);

      // ── Create a second payment link for cancel test ──
      await practitionerPage.locator('[data-testid="create-payment-link-btn"]').click();
      await expect(practitionerPage.locator('[data-testid="create-payment-link-dialog"]')).toBeVisible({ timeout: 10000 });

      const secondEmail = generateUniqueEmail('pay-cancel', testInfo);
      await practitionerPage.locator('[data-testid="payment-link-customer-email"]').fill(secondEmail);
      await practitionerPage.locator('[data-testid="payment-link-item-description-0"]').fill('Cancel Test');
      await practitionerPage.locator('[data-testid="payment-link-item-amount-0"]').fill('50');
      await practitionerPage.locator('[data-testid="payment-link-submit"]').click();
      await expect(practitionerPage.locator('[data-sonner-toast][data-type="success"]').first()).toBeVisible({ timeout: 15000 });
      await expect(practitionerPage.locator('[data-testid="create-payment-link-dialog"]')).not.toBeVisible({ timeout: 5000 });
      console.log('[Payment Links] Second link created for cancel test');

      await practitionerPage.waitForTimeout(2000);
      const secondRow = practitionerPage.locator('[data-testid^="payment-link-row-"]').filter({ hasText: secondEmail }).first();
      await expect(secondRow).toBeVisible({ timeout: 10000 });
      const secondRowTestId = await secondRow.getAttribute('data-testid');
      const secondLinkId = secondRowTestId!.replace('payment-link-row-', '');

      // Cancel
      await practitionerPage.locator(`[data-testid="payment-link-cancel-${secondLinkId}"]`).click();
      await expect(practitionerPage.locator('[data-testid="cancel-payment-link-confirm"]')).toBeVisible({ timeout: 5000 });
      await practitionerPage.locator('[data-testid="cancel-payment-link-yes"]').click();
      await practitionerPage.waitForTimeout(2000);

      await expect(practitionerPage.locator(`[data-testid="payment-link-status-${secondLinkId}"]`)).toContainText(/Cancel/i, { timeout: 10000 });
      console.log('[Payment Links] Second link cancelled');

      // ── Create a third payment link for resend test ──
      await practitionerPage.locator('[data-testid="create-payment-link-btn"]').click();
      await expect(practitionerPage.locator('[data-testid="create-payment-link-dialog"]')).toBeVisible({ timeout: 10000 });

      const thirdEmail = generateUniqueEmail('pay-resend', testInfo);
      await practitionerPage.locator('[data-testid="payment-link-customer-email"]').fill(thirdEmail);
      await practitionerPage.locator('[data-testid="payment-link-item-description-0"]').fill('Resend Test');
      await practitionerPage.locator('[data-testid="payment-link-item-amount-0"]').fill('15');
      await practitionerPage.locator('[data-testid="payment-link-submit"]').click();
      await expect(practitionerPage.locator('[data-sonner-toast][data-type="success"]').first()).toBeVisible({ timeout: 15000 });
      await expect(practitionerPage.locator('[data-testid="create-payment-link-dialog"]')).not.toBeVisible({ timeout: 5000 });
      console.log('[Payment Links] Third link created for resend test');

      await practitionerPage.waitForTimeout(2000);
      const thirdRow = practitionerPage.locator('[data-testid^="payment-link-row-"]').filter({ hasText: thirdEmail }).first();
      await expect(thirdRow).toBeVisible({ timeout: 10000 });
      const thirdRowTestId = await thirdRow.getAttribute('data-testid');
      const thirdLinkId = thirdRowTestId!.replace('payment-link-row-', '');

      // Resend
      await practitionerPage.locator(`[data-testid="payment-link-resend-${thirdLinkId}"]`).click();
      await expect(practitionerPage.locator('[data-sonner-toast][data-type="success"]').first()).toBeVisible({ timeout: 10000 });
      console.log('[Payment Links] Third link resent');

      // ── Create a multi-item payment link ──
      await practitionerPage.locator('[data-testid="create-payment-link-btn"]').click();
      await expect(practitionerPage.locator('[data-testid="create-payment-link-dialog"]')).toBeVisible({ timeout: 10000 });

      const multiItemEmail = generateUniqueEmail('pay-multi', testInfo);
      await practitionerPage.locator('[data-testid="payment-link-customer-email"]').fill(multiItemEmail);

      // Item 0: Energy Cleansing $35
      await practitionerPage.locator('[data-testid="payment-link-item-description-0"]').fill('Energy Cleansing');
      await practitionerPage.locator('[data-testid="payment-link-item-amount-0"]').fill('35');

      // Add a second item
      await practitionerPage.locator('[data-testid="payment-link-add-item"]').click();

      // Item 1: Crystal Gift $20
      await practitionerPage.locator('[data-testid="payment-link-item-description-1"]').fill('Crystal Gift');
      await practitionerPage.locator('[data-testid="payment-link-item-amount-1"]').fill('20');

      // Verify total
      await expect(practitionerPage.locator('[data-testid="payment-link-total"]')).toContainText('$55.00', { timeout: 5000 });
      console.log('[Payment Links] Multi-item total shows $55.00');

      // Verify remove button visible for item 1 (only shows when >1 items)
      await expect(practitionerPage.locator('[data-testid="payment-link-remove-item-1"]')).toBeVisible({ timeout: 5000 });
      console.log('[Payment Links] Remove button visible for second item');

      // Submit
      await practitionerPage.locator('[data-testid="payment-link-submit"]').click();
      await expect(practitionerPage.locator('[data-sonner-toast][data-type="success"]').first()).toBeVisible({ timeout: 15000 });
      await expect(practitionerPage.locator('[data-testid="create-payment-link-dialog"]')).not.toBeVisible({ timeout: 5000 });
      console.log('[Payment Links] Multi-item payment link created');

      // Find the new link in the list
      await practitionerPage.waitForTimeout(2000);
      const multiItemRow = practitionerPage.locator('[data-testid^="payment-link-row-"]').filter({ hasText: multiItemEmail }).first();
      await expect(multiItemRow).toBeVisible({ timeout: 10000 });
      const multiItemRowTestId = await multiItemRow.getAttribute('data-testid');
      const multiItemLinkId = multiItemRowTestId!.replace('payment-link-row-', '');
      console.log(`[Payment Links] Multi-item link ID: ${multiItemLinkId}`);

      // Verify amount shows $55.00
      await expect(practitionerPage.locator(`[data-testid="payment-link-amount-${multiItemLinkId}"]`)).toContainText('55.00');

      // ── Customer views multi-item checkout page ──
      let multiCustomerContext: BrowserContext | null = null;
      try {
        multiCustomerContext = await browser.newContext();
        const multiCustomerPage = await multiCustomerContext.newPage();

        await multiCustomerPage.goto(`/pay/${multiItemLinkId}`);
        await expect(multiCustomerPage.locator('[data-testid="payment-link-checkout"]')).toBeVisible({ timeout: 15000 });
        console.log('[Payment Links] Multi-item checkout page loaded');

        // Verify both items displayed
        await expect(multiCustomerPage.locator('[data-testid="checkout-item-0"]')).toContainText('Energy Cleansing');
        await expect(multiCustomerPage.locator('[data-testid="checkout-item-1"]')).toContainText('Crystal Gift');
        await expect(multiCustomerPage.locator('[data-testid="checkout-total"]')).toContainText('$55.00');
        console.log('[Payment Links] Multi-item checkout verified: 2 items, $55.00 total');
      } finally {
        if (multiCustomerContext) await multiCustomerContext.close();
      }

      console.log('[Payment Links] Full lifecycle complete');
    } finally {
      if (customerContext) await customerContext.close();
      await practitionerContext.close();
    }
  });
});
