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
 * Live Assist E2E — Full lifecycle: session, queue, reading, payment capture, summary
 *
 * Run: yarn test:grep "Live Assist"
 */

test.beforeAll(async ({ browser }, testInfo) => {
  test.setTimeout(240000);
  await setupIlluminatePractitioner(browser, testInfo, 'illum-live');
});

test.afterAll(async ({}, testInfo) => {
  test.setTimeout(120000);
  await cleanupIlluminatePractitioner(testInfo);
});

test.describe('Live Assist', () => {
  test('Live Assist — start session, customer queue, reading fulfillment, payment capture, summary', async ({ browser }, testInfo) => {
    test.setTimeout(600000); // 10 minutes — 2 Stripe auths + 2 readings

    const slug = practitionerSlugPerWorker.get(testInfo.parallelIndex);
    const cookies = practitionerCookiesPerWorker.get(testInfo.parallelIndex);
    expect(slug).toBeDefined();
    expect(cookies).toBeDefined();

    const practitionerContext = await createAuthenticatedContext(browser, cookies!);
    const practitionerPage = await practitionerContext.newPage();

    let customerContext: BrowserContext | null = null;
    let customer2Context: BrowserContext | null = null;

    try {
      // ── Navigate to Live Assist ──
      await practitionerPage.goto(`/p/${slug}/manage/live-assist`);
      await expect(practitionerPage.locator('[data-testid="live-assist-page"]')).toBeVisible({ timeout: 15000 });
      console.log('[Live Assist] Page loaded');

      // ── Start a live session ──
      await practitionerPage.locator('[data-testid="live-assist-page"] [data-testid="go-live-btn"]').click();
      await expect(practitionerPage.locator('[data-testid="start-live-session-dialog"]')).toBeVisible({ timeout: 10000 });

      await practitionerPage.locator('[data-testid="session-title-input"]').fill('Test Live Session');

      // Select CUSTOM pricing
      await practitionerPage.locator('[data-testid="pricing-custom"]').click();
      await practitionerPage.locator('[data-testid="custom-amount-input"]').fill('20');

      // Click Go Live inside dialog
      await practitionerPage.locator('[data-testid="start-live-session-dialog"] [data-testid="go-live-btn"]').click();
      console.log('[Live Assist] Go Live clicked, waiting for session creation...');

      // Wait for share URL
      await expect(practitionerPage.locator('[data-testid="share-url"]')).toBeVisible({ timeout: 30000 });
      console.log('[Live Assist] Session created — share URL visible');

      // Extract session code
      const shareUrlInput = practitionerPage.locator('[data-testid="share-url"]');
      const shareUrl = await shareUrlInput.inputValue();
      const sessionCodeMatch = shareUrl.match(/\/live\/([a-zA-Z0-9-]+)/);
      const sessionCode = sessionCodeMatch ? sessionCodeMatch[1] : null;
      expect(sessionCode).not.toBeNull();
      console.log(`[Live Assist] Session code: ${sessionCode}`);

      // Go to dashboard
      await practitionerPage.locator('[data-testid="go-to-dashboard-btn"]').click();
      await expect(practitionerPage.locator('[data-testid="live-queue-dashboard"]')).toBeVisible({ timeout: 15000 });
      console.log('[Live Assist] Queue dashboard loaded');

      // ── Customer joins the queue ──
      customerContext = await browser.newContext();
      const customerPage = await customerContext.newPage();

      await customerPage.goto(`/live/${sessionCode}`);
      await expect(customerPage.locator('[data-testid="live-join-form"]')).toBeVisible({ timeout: 15000 });
      console.log('[Live Assist] Customer join form loaded');

      // Verify title and price
      await expect(customerPage.locator('[data-testid="live-title"]')).toContainText('Test Live Session');
      await expect(customerPage.locator('[data-testid="live-price"]')).toContainText('20');

      // Fill customer info
      await customerPage.locator('[data-testid="join-name"]').fill('Queue Customer');
      await customerPage.locator('[data-testid="join-email"]').fill(generateUniqueEmail('live-cust', testInfo));
      await customerPage.locator('[data-testid="join-question"]').fill('What does my future hold?');

      // Submit join — retry if backend returns a transient error
      for (let joinAttempt = 1; joinAttempt <= 3; joinAttempt++) {
        await customerPage.locator('[data-testid="join-submit-btn"]').click();
        console.log(`[Live Assist] Customer submitted join request (attempt ${joinAttempt})...`);

        // Wait for either the authorization step or an error
        const authOrError = customerPage.locator('[data-testid="live-authorizing"]')
          .or(customerPage.locator('[data-testid="join-error"]'));
        await expect(authOrError).toBeVisible({ timeout: 15000 });

        if (await customerPage.locator('[data-testid="live-authorizing"]').isVisible().catch(() => false)) {
          break; // Success — proceed to Stripe
        }

        // Error appeared — log and retry
        const errorText = await customerPage.locator('[data-testid="join-error"]').textContent().catch(() => 'unknown');
        console.log(`[Live Assist] Join error: ${errorText} — retrying in 3s...`);
        await customerPage.waitForTimeout(3000);

        if (joinAttempt === 3) {
          throw new Error(`Join queue failed after 3 attempts: ${errorText}`);
        }
      }

      // Fill Stripe payment for authorization
      await fillStripePaymentElement(customerPage);

      // Authorize
      await customerPage.locator('[data-testid="authorize-btn"]').click();
      console.log('[Live Assist] Payment authorization submitted...');

      // Customer enters queue
      await expect(customerPage.locator('[data-testid="live-in-queue"]')).toBeVisible({ timeout: 30000 });
      console.log('[Live Assist] Customer is in queue');

      // ── Customer 2 joins the queue ──
      customer2Context = await browser.newContext();
      const customer2Page = await customer2Context.newPage();

      await customer2Page.goto(`/live/${sessionCode}`);
      await expect(customer2Page.locator('[data-testid="live-join-form"]')).toBeVisible({ timeout: 15000 });
      console.log('[Live Assist] Customer 2 join form loaded');

      await customer2Page.locator('[data-testid="join-name"]').fill('Queue Customer Two');
      await customer2Page.locator('[data-testid="join-email"]').fill(generateUniqueEmail('live-cust2', testInfo));
      await customer2Page.locator('[data-testid="join-question"]').fill('Will I find love?');

      for (let joinAttempt = 1; joinAttempt <= 3; joinAttempt++) {
        await customer2Page.locator('[data-testid="join-submit-btn"]').click();
        console.log(`[Live Assist] Customer 2 submitted join request (attempt ${joinAttempt})...`);

        const authOrError = customer2Page.locator('[data-testid="live-authorizing"]')
          .or(customer2Page.locator('[data-testid="join-error"]'));
        await expect(authOrError).toBeVisible({ timeout: 15000 });

        if (await customer2Page.locator('[data-testid="live-authorizing"]').isVisible().catch(() => false)) {
          break;
        }

        const errorText = await customer2Page.locator('[data-testid="join-error"]').textContent().catch(() => 'unknown');
        console.log(`[Live Assist] Customer 2 join error: ${errorText} — retrying in 3s...`);
        await customer2Page.waitForTimeout(3000);

        if (joinAttempt === 3) {
          throw new Error(`Customer 2 join queue failed after 3 attempts: ${errorText}`);
        }
      }

      await fillStripePaymentElement(customer2Page);
      await customer2Page.locator('[data-testid="authorize-btn"]').click();
      console.log('[Live Assist] Customer 2 payment authorization submitted...');

      await expect(customer2Page.locator('[data-testid="live-in-queue"]')).toBeVisible({ timeout: 30000 });
      console.log('[Live Assist] Customer 2 is in queue');

      // Customer 2 should be position #2
      await expect(customer2Page.locator('[data-testid="queue-position"]')).toContainText('#2', { timeout: 15000 });
      console.log('[Live Assist] Customer 2 sees position #2');

      // ── Practitioner sees both customers in queue ──
      let customerInQueue = false;
      for (let attempt = 0; attempt < 20; attempt++) {
        if (attempt > 0) {
          await practitionerPage.waitForTimeout(3000);
          await practitionerPage.reload();
          await practitionerPage.waitForLoadState('networkidle');
        }

        const nextUpCard = practitionerPage.locator('[data-testid="next-up-card"]');
        const isVisible = await nextUpCard.isVisible({ timeout: 3000 }).catch(() => false);
        if (isVisible) {
          customerInQueue = true;
          console.log(`[Live Assist] Customers visible in queue (attempt ${attempt + 1})`);
          break;
        }
        console.log(`[Live Assist] Waiting for customers in queue... (attempt ${attempt + 1}/20)`);
      }
      expect(customerInQueue).toBe(true);

      // Verify customer 1 is next up
      const nextUpCard = practitionerPage.locator('[data-testid="next-up-card"]');
      await expect(nextUpCard).toContainText('Queue Customer');

      // Verify practitioner sees 2 waiting
      await expect(practitionerPage.locator('[data-testid="stat-waiting"]')).toContainText('2', { timeout: 10000 });
      console.log('[Live Assist] Practitioner sees 2 waiting');

      // Verify queue list shows customer 2
      await expect(practitionerPage.locator('[data-testid="queue-list"]')).toBeVisible({ timeout: 10000 });
      console.log('[Live Assist] Queue list visible with waiting entries');

      // ── Start reading for Customer 1 ──
      await practitionerPage.locator('[data-testid="start-reading-btn"]').click();

      await expect(practitionerPage.locator('[data-testid="current-reading-card"]')).toBeVisible({ timeout: 15000 });
      await expect(practitionerPage.locator('[data-testid="current-name"]')).toContainText('Queue Customer');
      await expect(practitionerPage.locator('[data-testid="current-question"]')).toContainText('What does my future hold?');
      console.log('[Live Assist] Reading 1 started — customer 1 info visible');

      // Customer 1 should see "in progress"
      await expect(customerPage.locator('[data-testid="live-in-progress"]')).toBeVisible({ timeout: 30000 });
      console.log('[Live Assist] Customer 1 sees reading in progress');

      // Customer 2 should advance to position #1
      await expect(customer2Page.locator('[data-testid="queue-position"]')).toContainText('#1', { timeout: 30000 });
      console.log('[Live Assist] Customer 2 advanced to position #1');

      // ── Complete Customer 1's reading (triggers auto-advance to Customer 2) ──
      await practitionerPage.locator('[data-testid="complete-reading-btn"]').click();
      console.log('[Live Assist] Reading 1 complete button clicked');

      // ── Send post-reading summary for Customer 1 ──
      const summaryPanel1 = practitionerPage.locator('[data-testid="summary-panel"]');
      await expect(summaryPanel1).toBeVisible({ timeout: 10000 });

      await practitionerPage.locator('[data-testid="summary-note"]').fill('The cards showed a positive path ahead.');
      await practitionerPage.locator('[data-testid="summary-cta"]').fill('I recommend a deeper 1:1 session to explore this further.');
      await practitionerPage.locator('[data-testid="send-summary-btn"]').click();

      await expect(practitionerPage.locator('[data-testid="summary-sent"]')).toBeVisible({ timeout: 10000 });
      console.log('[Live Assist] Post-reading summary 1 sent');

      // Customer 1 should see "completed" state with charge amount
      await expect(customerPage.locator('[data-testid="live-completed"]')).toBeVisible({ timeout: 30000 });
      await expect(customerPage.locator('[data-testid="live-completed"]')).toContainText('20');
      console.log('[Live Assist] Customer 1 sees reading complete with charge');

      // ── Auto-advance: Customer 2's reading should start automatically ──
      // The handleCompleteReading auto-starts waitingEntries[0] on success
      await expect(practitionerPage.locator('[data-testid="current-reading-card"]')).toBeVisible({ timeout: 30000 });
      await expect(practitionerPage.locator('[data-testid="current-name"]')).toContainText('Queue Customer Two', { timeout: 10000 });
      console.log('[Live Assist] Auto-advance: Customer 2 reading started automatically');

      // Customer 2 should see "in progress"
      await expect(customer2Page.locator('[data-testid="live-in-progress"]')).toBeVisible({ timeout: 30000 });
      console.log('[Live Assist] Customer 2 sees reading in progress');

      // ── Complete Customer 2's reading ──
      await practitionerPage.locator('[data-testid="complete-reading-btn"]').click();

      await expect(practitionerPage.locator('[data-testid="current-reading-card"]')).not.toBeVisible({ timeout: 15000 });
      console.log('[Live Assist] Reading 2 completed — current reading card dismissed');

      // ── Send post-reading summary for Customer 2 ──
      const summaryPanel2 = practitionerPage.locator('[data-testid="summary-panel"]');
      await expect(summaryPanel2).toBeVisible({ timeout: 10000 });

      await practitionerPage.locator('[data-testid="summary-note"]').fill('Love is coming your way soon.');
      await practitionerPage.locator('[data-testid="summary-cta"]').fill('Book a follow-up to explore romantic timing.');
      await practitionerPage.locator('[data-testid="send-summary-btn"]').click();

      await expect(practitionerPage.locator('[data-testid="summary-sent"]')).toBeVisible({ timeout: 10000 });
      console.log('[Live Assist] Post-reading summary 2 sent');

      // Customer 2 should see "completed" state with charge amount
      await expect(customer2Page.locator('[data-testid="live-completed"]')).toBeVisible({ timeout: 30000 });
      await expect(customer2Page.locator('[data-testid="live-completed"]')).toContainText('20');
      console.log('[Live Assist] Customer 2 sees reading complete with charge');

      // ── Verify final stats: 2 completed, $40 ──
      let statsUpdated = false;
      for (let attempt = 0; attempt < 10; attempt++) {
        if (attempt > 0) {
          await practitionerPage.waitForTimeout(3000);
          await practitionerPage.reload();
          await practitionerPage.waitForLoadState('networkidle');
        }
        const completedText = await practitionerPage.locator('[data-testid="stat-completed"]').textContent().catch(() => '0');
        if (completedText && /2/.test(completedText)) {
          statsUpdated = true;
          console.log(`[Live Assist] Stats updated to 2 completed (attempt ${attempt + 1})`);
          break;
        }
        console.log(`[Live Assist] Waiting for stats to update... (attempt ${attempt + 1}/10)`);
      }
      expect(statsUpdated).toBe(true);

      await expect(practitionerPage.locator('[data-testid="stat-revenue"]')).toContainText('40', { timeout: 5000 });
      console.log('[Live Assist] Stats verified: 2 done, $40');

      // ── Pause / Resume ──
      await practitionerPage.locator('[data-testid="pause-btn"]').click();
      await expect(practitionerPage.locator('[data-testid="resume-btn"]')).toBeVisible({ timeout: 15000 });
      console.log('[Live Assist] Session PAUSED');

      await practitionerPage.locator('[data-testid="resume-btn"]').click();
      await expect(practitionerPage.locator('[data-testid="pause-btn"]')).toBeVisible({ timeout: 15000 });
      console.log('[Live Assist] Session RESUMED');

      // ── End session ──
      await practitionerPage.locator('[data-testid="end-session-btn"]').click();
      await expect(practitionerPage.locator('[data-testid="confirm-end-btn"]')).toBeVisible({ timeout: 5000 });
      await practitionerPage.locator('[data-testid="confirm-end-btn"]').click();

      await practitionerPage.waitForTimeout(2000);
      await practitionerPage.reload();
      await practitionerPage.waitForLoadState('networkidle');
      await expect(practitionerPage.locator('[data-testid="session-ended"]')).toBeVisible({ timeout: 15000 });
      console.log('[Live Assist] Session ENDED');

      // Navigate back to live assist list
      await practitionerPage.goto(`/p/${slug}/manage/live-assist`);
      await expect(practitionerPage.locator('[data-testid="live-assist-page"]')).toBeVisible({ timeout: 15000 });

      const pastSessionCard = practitionerPage.locator('[data-testid^="session-card-"]').first();
      await expect(pastSessionCard).toBeVisible({ timeout: 10000 });
      console.log('[Live Assist] Past session visible in list');

      await expect(practitionerPage.locator('[data-testid="go-live-btn"]')).toBeEnabled({ timeout: 5000 });
      console.log('[Live Assist] Go Live button enabled again');

      // ── Past session review ──
      await pastSessionCard.click();
      await expect(practitionerPage.locator('[data-testid="live-queue-dashboard"]')).toBeVisible({ timeout: 15000 });
      console.log('[Live Assist] Navigated to past session detail');

      await expect(practitionerPage.locator('[data-testid="session-ended"]')).toBeVisible({ timeout: 10000 });
      await expect(practitionerPage.locator('[data-testid="stat-completed"]')).toContainText('2', { timeout: 5000 });
      await expect(practitionerPage.locator('[data-testid="stat-revenue"]')).toContainText('40', { timeout: 5000 });
      console.log('[Live Assist] Past session stats verified: 2 completed, $40 revenue');

      await expect(practitionerPage.locator('[data-testid="completed-list"]')).toBeVisible({ timeout: 10000 });
      console.log('[Live Assist] Completed entries list visible');

      // Navigate back to list
      await practitionerPage.goto(`/p/${slug}/manage/live-assist`);
      await expect(practitionerPage.locator('[data-testid="live-assist-page"]')).toBeVisible({ timeout: 15000 });
      console.log('[Live Assist] Navigated back to list after past session review');

      console.log('[Live Assist] Full lifecycle complete');
    } finally {
      if (customer2Context) await customer2Context.close();
      if (customerContext) await customerContext.close();
      await practitionerContext.close();
    }
  });
});
